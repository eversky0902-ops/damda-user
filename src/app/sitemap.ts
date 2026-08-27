import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://withdamda.kr";

  // 로그인 없이 실제 콘텐츠를 볼 수 있는 공개 페이지만 제출합니다.
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/faq`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/notice`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/reservation-guide`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/refund-policy`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/partner`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // 사업장 상세는 비로그인 사용자와 검색로봇이 볼 수 있는 핵심 랜딩 페이지입니다.
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- businesses 타입 생성 반영 전
  const { data: businesses } = await (supabase as any)
    .from("businesses")
    .select("id")
    .eq("status", "active");

  const businessPages: MetadataRoute.Sitemap = (businesses ?? []).map((business: { id: string }) => ({
    url: `${baseUrl}/businesses/${business.id}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...businessPages];
}
