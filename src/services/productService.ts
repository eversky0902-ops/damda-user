import { createClient } from "@/lib/supabase/server";

export interface Product {
  id: string;
  name: string;
  summary: string | null;
  thumbnail: string;
  original_price: number;
  sale_price: number;
  region: string | null;
  max_participants: number;
  view_count: number;
  is_visible: boolean;
  business_owner?: {
    name: string;
  };
}

export async function getPopularProducts(limit = 8): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      summary,
      thumbnail,
      original_price,
      sale_price,
      region,
      max_participants,
      view_count,
      is_visible,
      business_owners:business_owner_id (
        name
      )
    `
    )
    .eq("is_visible", true)
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching popular products:", error);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    business_owner: item.business_owners as unknown as { name: string },
  }));
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      business_owners:business_owner_id (
        name
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching product:", error);
    return null;
  }

  return {
    ...data,
    business_owner: data.business_owners as unknown as { name: string },
  };
}
