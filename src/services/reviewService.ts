import { unstable_cache } from "next/cache";
import { createCacheClient } from "@/lib/supabase/cache-client";
import { createClient } from "@/lib/supabase/server";

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

export interface LandingReview {
  id: string;
  rating: number;
  content: string;
  daycare_label: string;
  product_name: string | null;
  product_region: string | null;
  created_at: string;
  reservation_linked: boolean;
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
  // Featured reviews are shown only after login. The request-bound client is
  // required because anonymous access to daycare identities is intentionally
  // blocked by RLS.
  const supabase = await createClient();
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
}

export async function getRecentReviews(limit = 6): Promise<Review[]> {
  return getRecentReviewsCached(limit);
}

function formatDaycareLabel(name: string, address: string | null): string {
  const regionSource = address?.trim().split(/\s+/)[0] || "";
  const region = regionSource
    .replace("서울특별시", "서울")
    .replace("인천광역시", "인천")
    .replace("경기도", "경기")
    .replace("부산광역시", "부산")
    .replace("대구광역시", "대구")
    .replace("광주광역시", "광주")
    .replace("대전광역시", "대전")
    .replace("울산광역시", "울산")
    .replace("세종특별자치시", "세종");
  const withoutType = name.replace(/\s*어린이집\s*$/, "").trim();
  const withoutRegion = region && withoutType.startsWith(region)
    ? withoutType.slice(region.length).trim()
    : withoutType;
  const visibleName = withoutRegion.slice(0, 2) || "어린";

  return `${region ? `${region} ` : ""}${visibleName}** 어린이집`;
}

/** 메인페이지용 공개 후기. 동적 메인에서 호출하여 새 후기를 즉시 반영합니다. */
export async function getLandingReviews(limit = 30): Promise<LandingReview[]> {
  const supabase = createCacheClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      id,
      rating,
      content,
      created_at,
      reservation_id,
      daycares:daycare_id (name, address),
      products:product_id (name, region)
    `)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching landing reviews:", error);
    return [];
  }

  return (data || []).map((item) => {
    const daycare = item.daycares as unknown as { name: string; address: string | null } | null;
    const product = item.products as unknown as { name: string; region: string | null } | null;
    return {
      id: item.id,
      rating: item.rating,
      content: item.content,
      daycare_label: daycare
        ? formatDaycareLabel(daycare.name, daycare.address)
        : "이용 어린이집",
      product_name: product?.name || null,
      product_region: product?.region || null,
      created_at: item.created_at,
      reservation_linked: Boolean(item.reservation_id),
    };
  });
}
