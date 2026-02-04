"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import type { Product } from "@/services/productService";

interface PopularTop4SectionProps {
  products: Product[];
}

// 카테고리별 해시태그 매핑
const CATEGORY_HASHTAGS: Record<string, string[]> = {
  farm: ["#농장", "#자연체험"],
  water: ["#물놀이", "#수영장"],
  animal: ["#동물", "#야외활동"],
  cooking: ["#쿠킹", "#제과"],
  science: ["#과학", "#박물관"],
  art: ["#미술", "#전시회"],
  musical: ["#뮤지컬", "#연극"],
  music: ["#음악", "#예술"],
  career: ["#직업체험", "#안전교육"],
  default: ["#체험학습", "#현장학습"],
};

export function PopularTop4Section({ products }: PopularTop4SectionProps) {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  if (products.length === 0) return null;

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6">
          어린이집 선생님들이 선택한 <span className="text-damda-yellow-dark">인기 체험장 TOP 4</span>
        </h2>

        {/* 2x2 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.slice(0, 4).map((product) => (
            <PopularProductCard key={product.id} product={product} dateParam={dateParam} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PopularProductCard({ product, dateParam }: { product: Product; dateParam: string | null }) {
  const [imageError, setImageError] = useState(false);
  const productHref = dateParam
    ? `/products/${product.id}?date=${dateParam}`
    : `/products/${product.id}`;

  // 카테고리 기반 해시태그
  const hashtags =
    CATEGORY_HASHTAGS[product.category_id || "default"] ||
    CATEGORY_HASHTAGS.default;

  return (
    <Link
      href={productHref}
      className="relative h-[200px] md:h-[240px] rounded-2xl overflow-hidden group"
    >
      {/* 배경 이미지 */}
      {imageError || !product.thumbnail ? (
        <div className="absolute inset-0 bg-gray-200" />
      ) : (
        <Image
          src={product.thumbnail}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 50vw"
          onError={() => setImageError(true)}
        />
      )}

      {/* 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* HOT 뱃지 */}
      <div className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
        HOT
      </div>

      {/* 하단 콘텐츠 */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* 해시태그 */}
        <p className="text-white/90 text-sm mb-1">
          {hashtags.join(" ")}
        </p>

        {/* 상품명 */}
        <h3 className="text-white font-semibold text-lg line-clamp-1 mb-1">
          {product.name}
        </h3>

        {/* 지역 */}
        {product.region && (
          <p className="flex items-center gap-1 text-white/80 text-sm">
            <MapPin className="w-3.5 h-3.5" />
            {product.region}
          </p>
        )}
      </div>
    </Link>
  );
}
