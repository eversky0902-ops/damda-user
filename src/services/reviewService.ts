import { unstable_cache } from "next/cache";
import { createCacheClient } from "@/lib/supabase/cache-client";

export interface Review {
  id: string;
  rating: number;
  content: string;
  created_at: string;
  daycare?: {
    name: string;
  };
  product?: {
    id: string;
    name: string;
    thumbnail: string;
  };
}

const REVIEW_SELECT = `
  id,
  rating,
  content,
  created_at,
  daycares:daycare_id (
    name
  ),
  products:product_id (
    id,
    name,
    thumbnail
  )
`;

type RawReview = {
  daycares: unknown;
  products: unknown;
  [key: string]: unknown;
};

function mapReview(item: RawReview): Review {
  return {
    ...(item as unknown as Review),
    daycare: item.daycares as unknown as { name: string },
    product: item.products as unknown as {
      id: string;
      name: string;
      thumbnail: string;
    },
  };
}

const getFeaturedReviewsCached = unstable_cache(
  async (limit: number): Promise<Review[]> => {
    const supabase = createCacheClient();

    const { data, error } = await supabase
      .from("reviews")
      .select(REVIEW_SELECT)
      .eq("is_visible", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching featured reviews:", error);
      return [];
    }

    return (data || []).map((item) => mapReview(item as RawReview));
  },
  ["featured-reviews"],
  { revalidate: 300, tags: ["reviews"] }
);

const getRecentReviewsCached = unstable_cache(
  async (limit: number): Promise<Review[]> => {
    const supabase = createCacheClient();

    const { data, error } = await supabase
      .from("reviews")
      .select(REVIEW_SELECT)
      .eq("is_visible", true)
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent reviews:", error);
      return [];
    }

    return (data || []).map((item) => mapReview(item as RawReview));
  },
  ["recent-reviews"],
  { revalidate: 300, tags: ["reviews"] }
);

export async function getFeaturedReviews(limit = 6): Promise<Review[]> {
  return getFeaturedReviewsCached(limit);
}

export async function getRecentReviews(limit = 6): Promise<Review[]> {
  return getRecentReviewsCached(limit);
}
