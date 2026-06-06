import { unstable_cache } from "next/cache";
import { createCacheClient } from "@/lib/supabase/cache-client";

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

const CATEGORY_COLUMNS =
  "id, name, sort_order, parent_id, depth, is_active, icon_url, banner_url";

const getMainCategoriesCached = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createCacheClient();

    const { data, error } = await supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .is("parent_id", null)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching main categories:", error);
      return [];
    }

    return data || [];
  },
  ["main-categories"],
  { revalidate: 600, tags: ["categories"] }
);

const getCategoriesWithChildrenCached = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createCacheClient();

    const { data, error } = await supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return [];
    }

    return data || [];
  },
  ["categories-with-children"],
  { revalidate: 600, tags: ["categories"] }
);

export async function getMainCategories(): Promise<Category[]> {
  return getMainCategoriesCached();
}

export async function getCategoriesWithChildren(): Promise<Category[]> {
  return getCategoriesWithChildrenCached();
}
