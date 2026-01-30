import { getMainBanners } from "@/services/bannerService";
import { HeroBannerCarousel } from "./HeroBannerCarousel";
import { SearchBar } from "./SearchBar";

export async function HeroBanner() {
  const banners = await getMainBanners();

  return (
    <section className="relative h-[400px]">
      {/* Banner Carousel */}
      <HeroBannerCarousel banners={banners} />

      {/* Content Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="w-full max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            선생님, 오늘은 어디로 떠날까요?
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 drop-shadow">
            아이들을 위한 특별한 장소, 담다가 소개해드릴게요!
          </p>

          {/* Search bar */}
          <div className="pointer-events-auto w-full">
            <SearchBar />
          </div>
        </div>
      </div>
    </section>
  );
}
