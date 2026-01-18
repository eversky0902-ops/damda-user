import { getFeaturedReviews } from "@/services/reviewService";
import { BestReviewsCarousel } from "./BestReviewsCarousel";

export async function BestReviews() {
  const reviews = await getFeaturedReviews(6);

  if (reviews.length === 0) {
    return null;
  }

  return <BestReviewsCarousel reviews={reviews} />;
}
