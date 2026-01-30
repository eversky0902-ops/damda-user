import { createClient } from "@/lib/supabase/client";

export interface Region {
  id: string;
  parent_id: string | null;
  name: string;
  full_name: string;
  depth: number;
  sort_order: number;
  is_popular: boolean;
  is_active: boolean;
}

export interface RegionWithChildren extends Region {
  children: Region[];
}

// 모든 지역 조회 (계층 구조로)
export async function getRegions(): Promise<RegionWithChildren[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("Error fetching regions:", error);
    return [];
  }

  // 시/도 (depth 1)
  const provinces = data.filter((r) => r.depth === 1);
  // 구/군 (depth 2)
  const districts = data.filter((r) => r.depth === 2);

  // 계층 구조로 변환
  return provinces.map((province) => ({
    ...province,
    children: districts.filter((d) => d.parent_id === province.id),
  }));
}

// 인기 지역 조회
export async function getPopularRegions(): Promise<Region[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .eq("is_active", true)
    .eq("is_popular", true)
    .eq("depth", 1)
    .order("sort_order");

  if (error) {
    console.error("Error fetching popular regions:", error);
    return [];
  }

  return data;
}
