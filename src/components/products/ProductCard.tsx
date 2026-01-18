"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/services/productService";

interface ProductCardProps {
  product: Product;
  onWishlistToggle?: (productId: string) => void;
  isWishlisted?: boolean;
}

export function ProductCard({
  product,
  onWishlistToggle,
  isWishlisted = false,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const discountRate = Math.round(
    ((product.original_price - product.sale_price) / product.original_price) * 100
  );

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlistToggle?.(product.id);
  };

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300"
    >
      {/* 이미지 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {imageError || !product.thumbnail ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
            <Image
              src="/logo.svg"
              alt="담다"
              width={80}
              height={40}
              className="opacity-30"
            />
            <span className="text-xs text-gray-400 mt-2">No Image</span>
          </div>
        ) : (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImageError(true)}
          />
        )}

        {/* 찜하기 버튼 */}
        <button
          onClick={handleWishlistClick}
          className={cn(
            "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors",
            isWishlisted
              ? "bg-damda-yellow text-gray-900"
              : "bg-white/80 text-gray-600 hover:bg-damda-yellow-light hover:text-damda-yellow-dark"
          )}
        >
          <Heart className={cn("w-5 h-5", isWishlisted && "fill-current")} />
        </button>

        {/* 품절 표시 */}
        {product.is_sold_out && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-lg">품절</span>
          </div>
        )}

        {/* 할인율 뱃지 */}
        {discountRate > 0 && !product.is_sold_out && (
          <div className="absolute top-3 left-3 bg-damda-teal text-white text-sm font-bold px-2.5 py-1 rounded-full">
            {discountRate}%
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="p-4">
        {/* 사업주 */}
        {product.business_owner && (
          <p className="text-xs text-gray-500 mb-1">
            {product.business_owner.name}
          </p>
        )}

        {/* 상품명 */}
        <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* 메타 정보 */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          {product.region && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {product.region}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {product.min_participants}-{product.max_participants}명
          </span>
        </div>

        {/* 가격 */}
        <div className="flex items-baseline gap-2">
          {discountRate > 0 && (
            <>
              <span className="text-sm font-bold text-damda-teal">
                {discountRate}%
              </span>
              <span className="text-sm text-gray-400 line-through">
                {product.original_price.toLocaleString()}원
              </span>
            </>
          )}
          <span className="text-lg font-bold text-damda-yellow-dark">
            {product.sale_price.toLocaleString()}원
          </span>
        </div>
      </div>
    </Link>
  );
}
