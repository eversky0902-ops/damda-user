import { createClient } from "@/lib/supabase/server";

// 공지사항 타입
export interface Notice {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_visible: boolean;
  view_count: number;
  created_at: string;
}

// 공지사항 목록 조회
export async function getNotices(
  page = 1,
  pageSize = 10
): Promise<{ data: Notice[]; total: number }> {
  const supabase = await createClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("notices")
    .select("*", { count: "exact" })
    .eq("is_visible", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching notices:", error);
    return { data: [], total: 0 };
  }

  return { data: data || [], total: count || 0 };
}

// 공지사항 상세 조회
export async function getNoticeById(id: string): Promise<Notice | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notices")
    .select("*")
    .eq("id", id)
    .eq("is_visible", true)
    .single();

  if (error) {
    console.error("Error fetching notice:", error);
    return null;
  }

  // 조회수 증가
  await supabase
    .from("notices")
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq("id", id);

  return data;
}

// FAQ 타입
export interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_visible: boolean;
}

// FAQ 목록 조회
export async function getFAQs(): Promise<FAQ[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_visible", true)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching FAQs:", error);
    return [];
  }

  return data || [];
}

// FAQ 카테고리별 그룹화
export function groupFAQsByCategory(faqs: FAQ[]): Map<string, FAQ[]> {
  const grouped = new Map<string, FAQ[]>();

  faqs.forEach((faq) => {
    const existing = grouped.get(faq.category) || [];
    grouped.set(faq.category, [...existing, faq]);
  });

  return grouped;
}

// 팝업 타입
export interface Popup {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  position: "center" | "bottom";
  width: number;
  height: number;
  start_date: string;
  end_date: string;
  is_visible: boolean;
}

// 활성 팝업 조회
export async function getActivePopups(): Promise<Popup[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("popups")
    .select("*")
    .eq("is_visible", true)
    .lte("start_date", now)
    .gte("end_date", now);

  if (error) {
    console.error("Error fetching popups:", error);
    return [];
  }

  return data || [];
}
