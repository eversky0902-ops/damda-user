"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getWishlistStatus,
  toggleWishlist,
} from "@/services/wishlistService";
import { useAuth } from "./use-auth";

export function useWishlist(productIds: string[]) {
  const { isAuthenticated } = useAuth();
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // 찜 상태 로드
  useEffect(() => {
    if (!isAuthenticated || productIds.length === 0) {
      setWishlistedIds(new Set());
      return;
    }

    const loadWishlistStatus = async () => {
      try {
        const status = await getWishlistStatus(productIds);
        setWishlistedIds(
          new Set(
            Object.entries(status)
              .filter(([, isWishlisted]) => isWishlisted)
              .map(([id]) => id)
          )
        );
      } catch (error) {
        console.error("Failed to load wishlist status:", error);
      }
    };

    loadWishlistStatus();
  }, [isAuthenticated, productIds]);

  // 찜 토글
  const handleToggle = useCallback(
    async (productId: string) => {
      if (!isAuthenticated) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      setIsLoading(true);

      try {
        const result = await toggleWishlist(productId);

        setWishlistedIds((prev) => {
          const next = new Set(prev);
          if (result.added) {
            next.add(productId);
          } else {
            next.delete(productId);
          }
          return next;
        });

        if (result.added) {
          toast.success("찜 목록에 추가했습니다.");
        } else {
          toast.success("찜 목록에서 삭제했습니다.");
        }
      } catch (error) {
        console.error("Failed to toggle wishlist:", error);
        toast.error("찜하기에 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated]
  );

  return {
    wishlistedIds,
    isLoading,
    toggleWishlist: handleToggle,
  };
}
