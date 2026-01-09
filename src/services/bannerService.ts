import { createClient } from "@/lib/supabase/server";

export interface Banner {
  id: string;
  type: "main" | "sub";
  title: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
}

export async function getMainBanners(): Promise<Banner[]> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("banners")
    .select("id, type, title, image_url, link_url, sort_order")
    .eq("type", "main")
    .eq("is_visible", true)
    .lte("start_date", now)
    .gte("end_date", now)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching main banners:", error);
    return [];
  }

  return data || [];
}

export async function getSubBanners(): Promise<Banner[]> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("banners")
    .select("id, type, title, image_url, link_url, sort_order")
    .eq("type", "sub")
    .eq("is_visible", true)
    .lte("start_date", now)
    .gte("end_date", now)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching sub banners:", error);
    return [];
  }

  return data || [];
}
