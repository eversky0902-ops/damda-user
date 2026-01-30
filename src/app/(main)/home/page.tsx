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
