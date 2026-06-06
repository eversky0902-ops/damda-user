import { unstable_cache } from "next/cache";
import { createCacheClient } from "@/lib/supabase/cache-client";

export interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  sort_order: number;
}

const getMainBannersCached = unstable_cache(
  async (): Promise<Banner[]> => {
    const supabase = createCacheClient();

    const { data, error } = await supabase
      .from("banners")
      .select("id, title, image_url, sort_order")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching main banners:", error);
      return [];
    }

    return data || [];
  },
  ["main-banners"],
  { revalidate: 300, tags: ["banners"] }
);

export async function getMainBanners(): Promise<Banner[]> {
  return getMainBannersCached();
}
