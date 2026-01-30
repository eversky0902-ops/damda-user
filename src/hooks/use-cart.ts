"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useCartStore, type CartItem } from "@/stores/cart-store";
import {
  getCart,
  addToCart as addToCartDB,
  removeFromCartByProductId,
  clearCart as clearCartDB,
} from "@/services/cartService";
import { useAuth } from "./use-auth";

export function useCart() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // 개별 selector로 store 함수들 가져오기 (참조 안정성 유지)
  const items = useCartStore((state) => state.items);
  const directItem = useCartStore((state) => state.directItem);
  const storeAddItem = useCartStore((state) => state.addItem);
  const storeRemoveItem = useCartStore((state) => state.removeItem);
  const storeUpdateItem = useCartStore((state) => state.updateItem);
  const storeClearCart = useCartStore((state) => state.clearCart);
  const storeSetDirectItem = useCartStore((state) => state.setDirectItem);
  const storeClearDirectItem = useCartStore((state) => state.clearDirectItem);
  const getTotalAmount = useCartStore((state) => state.getTotalAmount);
  const getItemCount = useCartStore((state) => state.getItemCount);

  const [isSyncing, setIsSyncing] = useState(false);
  const hasSynced = useRef(false);

  // Supabase에서 장바구니 동기화
  const syncFromDB = useCallback(async () => {
    if (!isAuthenticated || hasSynced.current) return;

    setIsSyncing(true);
    hasSynced.current = true;

    try {
      const dbCart = await getCart();

      // DB 데이터를 store 형식으로 변환
      const dbItems: CartItem[] = dbCart
        .filter((item) => item.product)
        .map((item) => ({
          product: {
            id: item.product!.id,
            name: item.product!.name,
            thumbnail: item.product!.thumbnail || "",
            original_price: item.product!.original_price,
            sale_price: item.product!.sale_price,
            business_owner_name: item.product!.business_owner?.name || "",
            min_participants: item.product!.min_participants || 1,
            max_participants: item.product!.max_participants || 999,
          },
          participants: item.options?.participant_count || 1,
          reservationDate: item.reserved_date || new Date().toISOString(),
          reservationTime: item.reserved_time || undefined,
          options: item.options?.options,
        }));

      // Store 초기화 후 DB 데이터로 채우기
      storeClearCart();
      dbItems.forEach((item) => storeAddItem(item));
    } catch (error) {
      console.error("Failed to sync cart from DB:", error);
      hasSynced.current = false; // 실패 시 다시 시도 가능하도록
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, storeClearCart, storeAddItem]);

  // 인증 상태 변경 시 동기화
  useEffect(() => {
    if (!authLoading && isAuthenticated && !hasSynced.current) {
      syncFromDB();
    }

    // 로그아웃 시 동기화 상태 리셋
    if (!isAuthenticated) {
      hasSynced.current = false;
    }
  }, [authLoading, isAuthenticated, syncFromDB]);

  // 장바구니에 추가
  const addItem = useCallback(
    async (item: CartItem) => {
      storeAddItem(item);

      if (isAuthenticated) {
        try {
          await addToCartDB({
            productId: item.product.id,
            reservedDate: item.reservationDate,
            reservedTime: item.reservationTime,
            participantCount: item.participants,
            options: item.options,
          });
        } catch (error) {
          console.error("Failed to add item to DB:", error);
        }
      }
    },
    [isAuthenticated, storeAddItem]
  );

  // 장바구니에서 삭제
  const removeItem = useCallback(
    async (productId: string) => {
      storeRemoveItem(productId);

      if (isAuthenticated) {
        try {
          await removeFromCartByProductId(productId);
        } catch (error) {
          console.error("Failed to remove item from DB:", error);
        }
      }
    },
    [isAuthenticated, storeRemoveItem]
  );

  // 장바구니 아이템 업데이트
  const updateItem = useCallback(
    async (productId: string, updates: Partial<Omit<CartItem, "product">>) => {
      storeUpdateItem(productId, updates);

      if (isAuthenticated) {
        // 현재 아이템 찾기
        const currentItems = useCartStore.getState().items;
        const item = currentItems.find((i) => i.product.id === productId);
        if (item) {
          try {
            await addToCartDB({
              productId,
              reservedDate: updates.reservationDate || item.reservationDate,
              reservedTime: updates.reservationTime || item.reservationTime,
              participantCount: updates.participants || item.participants,
              options: updates.options || item.options,
            });
          } catch (error) {
            console.error("Failed to update item in DB:", error);
          }
        }
      }
    },
    [isAuthenticated, storeUpdateItem]
  );

  // 장바구니 비우기
  const clearCart = useCallback(async () => {
    storeClearCart();

    if (isAuthenticated) {
      try {
        await clearCartDB();
      } catch (error) {
        console.error("Failed to clear cart in DB:", error);
      }
    }
  }, [isAuthenticated, storeClearCart]);

  // 바로예약 아이템 설정 (장바구니에 담지 않음)
  const setDirectItem = useCallback(
    (item: CartItem) => {
      storeSetDirectItem(item);
    },
    [storeSetDirectItem]
  );

  // 바로예약 아이템 클리어
  const clearDirectItem = useCallback(() => {
    storeClearDirectItem();
  }, [storeClearDirectItem]);

  return {
    items,
    directItem,
    isSyncing,
    addItem,
    removeItem,
    updateItem,
    clearCart,
    setDirectItem,
    clearDirectItem,
    getTotalAmount,
    getItemCount,
    syncFromDB,
  };
}
