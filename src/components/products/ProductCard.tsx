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
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImageError(true)}
          />
        )}

        {/* 예약가능 뱃지 */}
        {isAvailable && (
          <div className="absolute top-3 left-3 bg-damda-yellow text-gray-900 text-xs font-semibold px-2.5 py-1 rounded">
            예약가능
          </div>
        )}

        {/* 찜하기 버튼 */}
        <button
          onClick={handleWishlistClick}
          className={cn(
            "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
            isWishlisted
              ? "bg-damda-yellow text-gray-900"
              : "bg-white/90 text-gray-400 hover:text-damda-yellow-dark"
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
      </div>

      {/* 내용 */}
      <div className="p-4">
        {/* 상품명 */}
        <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1.5">
          {product.name}
        </h3>

        {/* 지역 */}
        {product.region && (
          <p className="flex items-center gap-1 text-sm text-gray-500 mb-2">
            <MapPin className="w-3.5 h-3.5" />
            {product.region}
          </p>
        )}

        {/* 별점 + 리뷰수 */}
        <div className="flex items-center gap-1 text-sm mb-3">
          <Star className="w-4 h-4 fill-damda-yellow text-damda-yellow" />
          <span className="font-medium text-gray-900">
            {product.average_rating?.toFixed(1) || "0.0"}
          </span>
          <span className="text-gray-400">
            ({product.review_count?.toLocaleString() || 0})
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>

        {/* 가격 */}
        <p className="text-lg font-bold text-gray-900">
          {product.sale_price.toLocaleString()}원~
        </p>
      </div>
    </Link>
  );
}
