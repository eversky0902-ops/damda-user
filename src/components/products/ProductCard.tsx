"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Star, ChevronRight } from "lucide-react";
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

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlistToggle?.(product.id);
  };

  const isAvailable = !product.is_sold_out;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300"
    >
      {/* 이미지 (왼쪽) */}
      <div className="relative w-[120px] sm:w-[140px] flex-shrink-0 overflow-hidden bg-gray-100">
        {imageError || !product.thumbnail ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
            <Image
              src="/logo.svg"
              alt="담다"
              width={60}
              height={30}
              className="opacity-30"
            />
          </div>
        ) : (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="140px"
            onError={() => setImageError(true)}
          />
        )}

        {/* 찜하기 버튼 */}
        <button
          onClick={handleWishlistClick}
          className={cn(
            "absolute top-2 right-2 transition-colors",
            isWishlisted
              ? "text-red-500"
              : "text-white drop-shadow-md hover:text-red-400"
          )}
        >
          <Heart className={cn("w-5 h-5", isWishlisted && "fill-current")} />
        </button>

        {/* 품절 표시 */}
        {product.is_sold_out && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-sm">품절</span>
          </div>
        )}
      </div>

      {/* 내용 (오른쪽) */}
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          {/* 예약가능 뱃지 */}
          {isAvailable && (
            <span className="inline-block bg-emerald-500 text-white text-[10px] font-medium px-2 py-0.5 rounded mb-1.5">
              예약가능
            </span>
          )}

          {/* 상품명 */}
          <h3 className="font-bold text-gray-900 line-clamp-2 text-sm leading-tight mb-1.5 group-hover:text-damda-yellow-dark transition-colors">
            {product.name}
          </h3>

          {/* 지역 */}
          {product.region && (
            <p className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{product.region}</span>
            </p>
          )}

          {/* 별점 + 리뷰수 */}
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
            <span className="font-medium text-gray-900">
              {product.average_rating?.toFixed(1) || "0.0"}
            </span>
            <span className="text-xs text-gray-400">
              ({product.review_count?.toLocaleString() || 0})
            </span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
          </div>
        </div>

        {/* 가격 (하단 우측) */}
        <div className="text-right mt-2">
          <span className="text-sm font-bold text-gray-900">
            {product.sale_price.toLocaleString()}원
          </span>
          <span className="text-xs text-gray-500"> ~</span>
        </div>
      </div>
    </Link>
  );
}
