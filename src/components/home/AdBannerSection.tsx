"use client";

import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import type { AdBanner } from "@/types";

interface AdBannerSectionProps {
  banners: AdBanner[];
}

function AdBannerCard({ banner }: { banner: AdBanner }) {
  return (
    <Link
      href={banner.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative overflow-hidden rounded-2xl group hover:shadow-lg transition-shadow h-[160px] block flex-shrink-0 w-[320px]"
    >
      <Image
        src={banner.image_url}
        alt={banner.title}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
      <div className="absolute inset-0 p-5 flex flex-col justify-center">
        <p className="text-xs text-white/80 mb-1">{banner.advertiser_name}</p>
        <h3 className="text-lg font-bold text-white mb-3 line-clamp-2">
          {banner.title}
        </h3>
        <span className="inline-flex items-center gap-1 text-xs font-medium bg-damda-yellow text-damda-brown px-3 py-1.5 rounded-full w-fit">
          바로가기 <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}

function GridBannerCard({ banner }: { banner: AdBanner }) {
  return (
    <Link
      href={banner.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative overflow-hidden rounded-2xl group hover:shadow-lg transition-shadow h-[160px] block"
    >
      <Image
        src={banner.image_url}
        alt={banner.title}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
      <div className="absolute inset-0 p-5 flex flex-col justify-center">
        <p className="text-xs text-white/80 mb-1">{banner.advertiser_name}</p>
        <h3 className="text-lg font-bold text-white mb-3 line-clamp-2">
          {banner.title}
        </h3>
        <span className="inline-flex items-center gap-1 text-xs font-medium bg-damda-yellow text-damda-brown px-3 py-1.5 rounded-full w-fit">
          바로가기 <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}

export function AdBannerSection({ banners }: AdBannerSectionProps) {
  if (banners.length === 0) {
    return null;
  }

  // 3개 이하면 그리드로 표시
  if (banners.length <= 3) {
    return (
      <section className="py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div
            className={`grid gap-4 ${
              banners.length === 1
                ? "grid-cols-1"
                : banners.length === 2
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 md:grid-cols-3"
            }`}
          >
            {banners.map((banner) => (
              <GridBannerCard key={banner.id} banner={banner} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 4개 이상이면 무한 스크롤 마퀴
  // 배너를 복제해서 끊김 없는 무한 스크롤 구현
  const duplicatedBanners = [...banners, ...banners];

  return (
    <section className="py-8 bg-white">
      <div className="max-w-6xl mx-auto px-4 overflow-hidden relative">
        {/* 왼쪽 페이드 */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        {/* 오른쪽 페이드 */}
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div className="relative">
          <div
            className="flex gap-4 animate-marquee hover:[animation-play-state:paused]"
            style={{
              width: `${duplicatedBanners.length * 336}px`, // 320px + 16px gap
            }}
          >
            {duplicatedBanners.map((banner, index) => (
              <AdBannerCard key={`${banner.id}-${index}`} banner={banner} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
