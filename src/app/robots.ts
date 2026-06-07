import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // 프리뷰/개발 배포(dev.withdamda.kr 등)는 검색 색인 전체 차단
  if (process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/mypage/"],
    },
    sitemap: "https://withdamda.kr/sitemap.xml",
  };
}
