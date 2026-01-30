import { createClient } from "@/lib/supabase/server";

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  parent_id: string | null;
  depth: number;
  is_active: boolean;
  icon_url: string | null;
  banner_url: string | null;
}

export async function getMainCategories(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order, parent_id, depth, is_active, icon_url, banner_url")
    .is("parent_id", null)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching main categories:", error);
    return [];
  }

  return data || [];
}

export async function getCategoriesWithChildren(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order, parent_id, depth, is_active, icon_url, banner_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return data || [];
}
