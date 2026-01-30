import {
  HeroBanner,
  CategoryGrid,
  PopularExperiences,
  BestReviews,
} from "@/components/home";
import { PopupContainer } from "@/components/common/PopupModal";
import { getActivePopups } from "@/services/popupService";

export default async function HomePage() {
  const popups = await getActivePopups();

  return (
    <>
      <HeroBanner />
      <CategoryGrid />
      <PopularExperiences />
      <BestReviews />
      {popups.length > 0 && <PopupContainer popups={popups} />}
    </>
  );
}
