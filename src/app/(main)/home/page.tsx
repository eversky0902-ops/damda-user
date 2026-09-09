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

// The catalogue and reviews are protected by RLS and must use the signed-in
// daycare session. Rendering this route as ISR would execute it with anon at
// build time and cache an empty home page for every member.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
