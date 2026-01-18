import { Search } from "lucide-react";
import { getMainBanners } from "@/services/bannerService";
import Image from "next/image";
import { SearchBar } from "./SearchBar";

export async function HeroBanner() {
  const banners = await getMainBanners();
  const mainBanner = banners[0]; // 첫 번째 배너 사용

  return (
    <section className="relative h-[400px]">
      {/* Background */}
      <Image
        src={mainBanner?.image_url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80"}
        alt={mainBanner?.title || "어린이 체험학습"}
        fill
        className="object-cover"
        priority
      />
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/30" />


      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
          선생님, 오늘은 어디로 떠날까요?
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-8 drop-shadow">
          아이들을 위한 특별한 장소, 담다가 소개해드릴게요!
        </p>

        {/* Search bar */}
        <SearchBar />
      </div>

    </section>
  );
}
