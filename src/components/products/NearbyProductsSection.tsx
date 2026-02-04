"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Star, MapPin, Heart } from "lucide-react";
import type { Product } from "@/services/productService";

interface NearbyProductsSectionProps {
  products: Product[];
  region?: string;
}

export function NearbyProductsSection({ products, region = "서울" }: NearbyProductsSectionProps) {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  if (products.length === 0) return null;

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            {region} 지역 추천 체험장
          </h2>
          <Link
            href={`/products?region=${encodeURIComponent(region)}${dateParam ? `&date=${dateParam}` : ""}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            전체보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 수평 스크롤 카드 */}
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {products.slice(0, 4).map((product) => (
            <NearbyProductCard key={product.id} product={product} dateParam={dateParam} />
          ))}
        </div>
      </div>
    </section>
  );
}

function NearbyProductCard({ product, dateParam }: { product: Product; dateParam: string | null }) {
  const [imageError, setImageError] = useState(false);
  const productHref = dateParam
    ? `/products/${product.id}?date=${dateParam}`
    : `/products/${product.id}`;

  // 표시 가격 (할인가 우선, 없으면 정가)
  const displayPrice = product.sale_price || product.original_price;

  return (
    <Link
      href={productHref}
      className="flex-shrink-0 w-[180px] md:w-[200px] group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* 이미지 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {imageError || !product.thumbnail ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <span className="text-xs text-gray-400">No Image</span>
          </div>
        ) : (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="200px"
            onError={() => setImageError(true)}
          />
        )}

        {/* 찜 아이콘 (우측 상단) */}
        <div className="absolute top-2 right-2">
          <Heart className="w-5 h-5 text-white drop-shadow-md" />
        </div>
      </div>

      {/* 내용 */}
      <div className="p-3">
        {/* 상품명 */}
        <h3 className="font-bold text-gray-900 line-clamp-2 text-sm leading-tight mb-1.5 group-hover:text-damda-yellow-dark transition-colors">
          {product.name}
        </h3>

        {/* 위치 */}
        {product.region && (
          <p className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
            <MapPin className="w-3 h-3" />
            {product.region}
          </p>
        )}

        {/* 별점 */}
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium text-gray-900">
            {product.average_rating?.toFixed(1) || "0.0"}
          </span>
          <span className="text-xs text-gray-400">
            ({product.review_count || 0})
          </span>
          <ChevronRight className="w-3 h-3 text-gray-300" />
        </div>

        {/* 가격 */}
        <div className="text-right">
          <span className="text-sm font-bold text-gray-900">
            {displayPrice?.toLocaleString() || 0}원
          </span>
          <span className="text-xs text-gray-500"> ~</span>
        </div>
      </div>
    </Link>
  );
}
