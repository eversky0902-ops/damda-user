import {
  HeroBanner,
  CategoryGrid,
  PopularExperiences,
  BestReviews,
  AdBannerSection,
} from "@/components/home";
import { PopupContainer } from "@/components/common/PopupModal";
import { getActivePopups } from "@/services/popupService";
import { getActiveAdBanners } from "@/services/adBannerService";

// 홈 콘텐츠는 로그인 사용자 공통(개인화 없음) → ISR(5분). 접근 제어는 미들웨어가 담당.
export const revalidate = 300;

export default async function HomePage() {
  const [popups, adBanners] = await Promise.all([
    getActivePopups(),
    getActiveAdBanners(),
  ]);

  return (
    <>
      <HeroBanner />
      <CategoryGrid />
      <AdBannerSection banners={adBanners} />
      <PopularExperiences />
      <BestReviews />
      {popups.length > 0 && <PopupContainer popups={popups} />}
    </>
  );
}
