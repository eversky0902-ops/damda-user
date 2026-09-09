import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://withdamda.kr";

  // 폐쇄형 서비스: 검색엔진에는 담다 랜딩 페이지만 제출합니다.
  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
  ];
}
