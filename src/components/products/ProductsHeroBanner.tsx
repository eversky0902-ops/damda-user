"use client";

import Image from "next/image";
import { SearchBar } from "@/components/home/SearchBar";

interface ProductsHeroBannerProps {
  categoryName?: string;
  categoryBannerUrl?: string;
}

// 카테고리명별 기본 배너 이미지
const DEFAULT_BANNERS: Record<string, string> = {
  'BEST 체험': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
  '계절 특화체험': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
  '농장/자연': 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600&q=80',
  '과학/박물관': 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1600&q=80',
  '미술/전시회': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1600&q=80',
  '요리/클래스': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1600&q=80',
  '물놀이/수영장': 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1600&q=80',
  '동물/야외활동': 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=1600&q=80',
  '뮤지컬/연극': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1600&q=80',
  '음악/예술': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80',
  '놀이동산/수족관': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
  '직업/전통/안전': 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1600&q=80',
};
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80';

export function ProductsHeroBanner({
  categoryName,
  categoryBannerUrl,
}: ProductsHeroBannerProps) {
  // 배너 이미지 결정: 커스텀 배너 > 카테고리명 기반 기본 배너 > 전체 기본 배너
  const bannerUrl =
    categoryBannerUrl ||
    (categoryName && DEFAULT_BANNERS[categoryName]) ||
    DEFAULT_BANNER;

  return (
    <section className="relative h-[280px] md:h-[320px]">
      {/* 배경 이미지 */}
      <Image
        src={bannerUrl}
        alt={categoryName || "체험학습"}
        fill
        className="object-cover"
        priority
      />

      {/* 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50" />

      {/* 콘텐츠 */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        {/* 제목 */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg">
          {categoryName || "전체 체험학습"}
        </h1>

        {/* 부제목 */}
        <p className="text-sm md:text-base text-white/90 mb-6 drop-shadow text-center">
          담다에서 안전하고 재밌는 체험학습을 소개해드릴게요!
        </p>

        {/* 검색 바 */}
        <SearchBar />
      </div>
    </section>
  );
}
