import { createClient } from "@/lib/supabase/server";

export type PopupPosition = "center" | "bottom-left" | "bottom-right" | "top-left" | "top-right";

export interface Popup {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  position: PopupPosition;
  width: number | null;
  height: number | null;
  start_date: string;
  end_date: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 현재 활성화된 팝업 목록 조회
 * - is_visible이 true
 * - 현재 날짜가 start_date와 end_date 사이
 */
export async function getActivePopups(): Promise<Popup[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("popups")
    .select("*")
    .eq("is_visible", true)
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching active popups:", error);
    return [];
  }

  return data || [];
}
