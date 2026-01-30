"use client";

import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { SearchBar } from "@/components/home/SearchBar";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductsHeroBannerProps {
  categoryName?: string;
  categoryBannerUrl?: string;
}

// 카테고리별 기본 배너 이미지
const DEFAULT_BANNERS: Record<string, string> = {
  farm: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600&q=80",
  science: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1600&q=80",
  art: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1600&q=80",
  cooking: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1600&q=80",
  water: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1600&q=80",
  animal: "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=1600&q=80",
  musical: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1600&q=80",
  music: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80",
  career: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1600&q=80",
  default: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80",
};

export function ProductsHeroBanner({
  categoryName,
  categoryBannerUrl,
}: ProductsHeroBannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const availableOnly = searchParams.get("availableOnly") === "true";

  // 카테고리 ID에서 배너 이미지 결정
  const categoryId = searchParams.get("category") || "";
  const bannerUrl =
    categoryBannerUrl ||
    DEFAULT_BANNERS[categoryId] ||
    DEFAULT_BANNERS.default;

  const handleAvailableOnlyChange = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set("availableOnly", "true");
    } else {
      params.delete("availableOnly");
    }
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  };

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

        {/* 예약가능 체크박스 */}
        <label className="flex items-center gap-2 mt-4 cursor-pointer">
          <Checkbox
            checked={availableOnly}
            onCheckedChange={handleAvailableOnlyChange}
            className="border-white/60 data-[state=checked]:bg-damda-yellow data-[state=checked]:border-damda-yellow"
          />
          <span className="text-sm text-white/90">예약가능한 체험학습만 보기</span>
        </label>
      </div>
    </section>
  );
}
