"use client";

import { useEffect, useState, useCallback } from "react";
import { useCartStore, type CartItem } from "@/stores/cart-store";
import {
  getCart,
  addToCart as addToCartDB,
  removeFromCartByProductId,
  clearCart as clearCartDB,
  type CartItemDB,
} from "@/services/cartService";
import { useAuth } from "./use-auth";

export function useCart() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const store = useCartStore();
  const [isSyncing, setIsSyncing] = useState(false);

  // Supabase에서 장바구니 동기화
  const syncFromDB = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsSyncing(true);
    try {
      const dbCart = await getCart();

      // DB 데이터를 store 형식으로 변환
      const items: CartItem[] = dbCart
        .filter((item) => item.product)
        .map((item) => ({
          product: {
            id: item.product!.id,
            name: item.product!.name,
            thumbnail: item.product!.thumbnail || "",
            sale_price: item.product!.sale_price,
            business_owner_name: item.product!.business_owner?.name || "",
          },
          participants: item.options?.participant_count || 1,
          reservationDate: item.reserved_date || new Date().toISOString(),
          options: item.options?.options,
        }));

      // Store 초기화 후 DB 데이터로 채우기
      store.clearCart();
      items.forEach((item) => store.addItem(item));
    } catch (error) {
      console.error("Failed to sync cart from DB:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, store]);

  // 인증 상태 변경 시 동기화
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      syncFromDB();
    }
  }, [authLoading, isAuthenticated, syncFromDB]);

  // 장바구니에 추가
  const addItem = useCallback(
    async (item: CartItem) => {
      store.addItem(item);

      if (isAuthenticated) {
        try {
          await addToCartDB({
            productId: item.product.id,
            reservedDate: item.reservationDate,
            participantCount: item.participants,
            options: item.options,
          });
        } catch (error) {
          console.error("Failed to add item to DB:", error);
        }
      }
    },
    [isAuthenticated, store]
  );

  // 장바구니에서 삭제
  const removeItem = useCallback(
    async (productId: string) => {
      store.removeItem(productId);

      if (isAuthenticated) {
        try {
          await removeFromCartByProductId(productId);
        } catch (error) {
          console.error("Failed to remove item from DB:", error);
        }
      }
    },
    [isAuthenticated, store]
  );

  // 장바구니 아이템 업데이트
  const updateItem = useCallback(
    async (productId: string, updates: Partial<Omit<CartItem, "product">>) => {
      store.updateItem(productId, updates);

      if (isAuthenticated) {
        const item = store.items.find((i) => i.product.id === productId);
        if (item) {
          try {
            await addToCartDB({
              productId,
              reservedDate: updates.reservationDate || item.reservationDate,
              participantCount: updates.participants || item.participants,
              options: updates.options || item.options,
            });
          } catch (error) {
            console.error("Failed to update item in DB:", error);
          }
        }
      }
    },
    [isAuthenticated, store]
  );

  // 장바구니 비우기
  const clearCart = useCallback(async () => {
    store.clearCart();

    if (isAuthenticated) {
      try {
        await clearCartDB();
      } catch (error) {
        console.error("Failed to clear cart in DB:", error);
      }
    }
  }, [isAuthenticated, store]);

  return {
    items: store.items,
    isSyncing,
    addItem,
    removeItem,
    updateItem,
    clearCart,
    getTotalAmount: store.getTotalAmount,
    getItemCount: store.getItemCount,
    syncFromDB,
  };
}
