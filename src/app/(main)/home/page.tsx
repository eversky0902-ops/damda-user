import {
  HeroBanner,
  CategoryGrid,
  PopularExperiences,
  BestReviews,
} from "@/components/home";

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <CategoryGrid />
      <PopularExperiences />
      <BestReviews />
    </>
  );
}
