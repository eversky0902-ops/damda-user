"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Star, MapPin, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/services/productService";

interface NearbyProductsSectionProps {
  products: Product[];
}

export function NearbyProductsSection({ products }: NearbyProductsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            현재 위치에서 가까운 체험장 추천
          </h2>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            전체보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 수평 스크롤 카드 */}
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {products.slice(0, 4).map((product) => (
            <NearbyProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function NearbyProductCard({ product }: { product: Product }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/products/${product.id}`}
      className="flex-shrink-0 w-[200px] md:w-[240px] group"
    >
      {/* 이미지 */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-3">
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
            sizes="240px"
            onError={() => setImageError(true)}
          />
        )}

        {/* 별점 뱃지 */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-damda-yellow rounded text-xs font-semibold text-gray-900">
          <Star className="w-3 h-3 fill-current" />
          {product.average_rating?.toFixed(1) || "0.0"}
        </div>
      </div>

      {/* 내용 */}
      <h3 className="font-medium text-gray-900 line-clamp-1 mb-1 group-hover:text-damda-yellow-dark transition-colors">
        {product.name}
      </h3>
      {product.region && (
        <p className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          {product.region}
        </p>
      )}
    </Link>
  );
}
