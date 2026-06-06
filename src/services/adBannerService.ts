import { unstable_cache } from "next/cache";
import { createCacheClient } from "@/lib/supabase/cache-client";
import type { AdBanner } from "@/types";

const getActiveAdBannersCached = unstable_cache(
  async (today: string): Promise<AdBanner[]> => {
    const supabase = createCacheClient();

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
    return (data || []).filter((banner) => {
      const startValid = !banner.start_date || banner.start_date <= today;
      const endValid = !banner.end_date || banner.end_date >= today;
      return startValid && endValid;
    });
  },
  ["active-ad-banners"],
  { revalidate: 300, tags: ["ad-banners"] }
);

export async function getActiveAdBanners(): Promise<AdBanner[]> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD (캐시 키에 포함되어 날짜 바뀌면 자동 갱신)
  return getActiveAdBannersCached(today);
}
