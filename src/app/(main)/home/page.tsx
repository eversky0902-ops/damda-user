import {
  HeroBanner,
  CategoryGrid,
  PopularExperiences,
  BestReviews,
  PromotionBanners,
} from "@/components/home";

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <CategoryGrid />
      <PopularExperiences />
      <BestReviews />
      <PromotionBanners />
    </>
  );
}
