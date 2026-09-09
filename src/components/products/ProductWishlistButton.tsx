"use client";

import { useMemo } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/hooks/use-wishlist";

interface ProductWishlistButtonProps {
  productId?: string;
  label?: string;
  className?: string;
}

/** 기존 wishlists 테이블을 사용하는 공용 상품 찜 버튼입니다. */
export function ProductWishlistButton({
  productId,
  label = "상품",
  className,
}: ProductWishlistButtonProps) {
  const productIds = useMemo(() => (productId ? [productId] : []), [productId]);
  const { wishlistedIds, isLoading, toggleWishlist } = useWishlist(productIds);

  if (!productId) return null;

  const isWishlisted = wishlistedIds.has(productId);

  return (
    <button
      type="button"
      aria-pressed={isWishlisted}
      aria-label={
        isWishlisted
          ? `${label} 찜 목록에서 삭제`
          : `${label} 찜 목록에 추가`
      }
      title={isWishlisted ? "찜 목록에서 삭제" : "찜 목록에 추가"}
      disabled={isLoading}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleWishlist(productId);
      }}
      className={cn(
        "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-damda-yellow focus-visible:ring-offset-2",
        isWishlisted
          ? "bg-damda-yellow text-gray-900"
          : "bg-white/95 text-gray-500 hover:text-damda-yellow-dark",
        className
      )}
    >
      <Heart
        aria-hidden="true"
        className={cn("h-5 w-5", isWishlisted && "fill-current")}
      />
    </button>
  );
}
