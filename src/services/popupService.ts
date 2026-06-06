import { unstable_cache } from "next/cache";
import { createCacheClient } from "@/lib/supabase/cache-client";

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
 * is_visible=true 인 팝업 원본 목록 (날짜 무관). 60초 캐시.
 * 날짜 윈도우 필터링은 캐시 바깥에서 매 요청 시점 기준으로 처리한다.
 */
const getVisiblePopupsCached = unstable_cache(
  async (): Promise<Popup[]> => {
    const supabase = createCacheClient();

    const { data, error } = await supabase
      .from("popups")
      .select("*")
      .eq("is_visible", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching active popups:", error);
      return [];
    }

    return (data || []) as Popup[];
  },
  ["visible-popups"],
  { revalidate: 60, tags: ["popups"] }
);

/**
 * 현재 활성화된 팝업 목록 조회
 * - is_visible이 true
 * - 현재 날짜가 start_date와 end_date 사이
 */
export async function getActivePopups(): Promise<Popup[]> {
  const popups = await getVisiblePopupsCached();
  const now = new Date().toISOString();

  return popups.filter((p) => {
    const startValid = !p.start_date || p.start_date <= now;
    const endValid = !p.end_date || p.end_date >= now;
    return startValid && endValid;
  });
}
