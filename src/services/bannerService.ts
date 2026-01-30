import { createClient } from "@/lib/supabase/server";

export interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  sort_order: number;
}

export async function getMainBanners(): Promise<Banner[]> {
  const supabase = await createClient();

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
}
