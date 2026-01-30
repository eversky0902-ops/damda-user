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

export async function getFeaturedReviews(limit = 6): Promise<Review[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
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
    `
    )
    .eq("is_visible", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching featured reviews:", error);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    daycare: item.daycares as unknown as { name: string },
    product: item.products as unknown as { id: string; name: string; thumbnail: string },
  }));
}

export async function getRecentReviews(limit = 6): Promise<Review[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
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
    `
    )
    .eq("is_visible", true)
    .gte("rating", 4)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent reviews:", error);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    daycare: item.daycares as unknown as { name: string },
    product: item.products as unknown as { id: string; name: string; thumbnail: string },
  }));
}
