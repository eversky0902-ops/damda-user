import { createClient } from "@/lib/supabase/server";
import type { AdBanner } from "@/types";

export async function getActiveAdBanners(): Promise<AdBanner[]> {
  const supabase = await createClient();
  const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from("ad_banners")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching ad banners:", error);
    return [];
  }

  // 날짜 필터링 (start_date와 end_date 체크)
  const filteredData = (data || []).filter((banner) => {
    const startValid = !banner.start_date || banner.start_date <= now;
    const endValid = !banner.end_date || banner.end_date >= now;
    return startValid && endValid;
  });

  return filteredData;
}
