"use server";

import { createClient } from "@/lib/supabase/server";

export interface RecentViewProduct {
  id: string;
  name: string;
  thumbnail: string | null;
  sale_price: number;
  original_price: number;
  region: string | null;
  viewed_at: string;
}

// 최근 본 상품 목록 조회
export async function getRecentViewsClient(limit = 20): Promise<RecentViewProduct[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("recent_views")
    .select(`
      viewed_at,
      products:product_id (
        id,
        name,
        thumbnail,
        sale_price,
        original_price,
        region
      )
    `)
    .eq("daycare_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent views:", error);
    return [];
  }

  return (data || [])
    .filter((item) => item.products)
    .map((item) => {
      const product = item.products as unknown as {
        id: string;
        name: string;
        thumbnail: string | null;
        sale_price: number;
        original_price: number;
        region: string | null;
      };
      return {
        ...product,
        viewed_at: item.viewed_at,
      };
    });
}

// 최근 본 상품 삭제
export async function removeRecentView(productId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("recent_views")
    .delete()
    .eq("daycare_id", user.id)
    .eq("product_id", productId);

  if (error) {
    console.error("Error removing recent view:", error);
    return false;
  }

  return true;
}

// 최근 본 상품 전체 삭제
export async function clearRecentViews(): Promise<boolean> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("recent_views")
    .delete()
    .eq("daycare_id", user.id);

  if (error) {
    console.error("Error clearing recent views:", error);
    return false;
  }

  return true;
}
