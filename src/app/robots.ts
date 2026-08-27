import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Vercel 프리뷰/개발 배포만 차단합니다. VERCEL_ENV가 없는 운영 환경은 허용합니다.
  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/mypage/", "/checkout/", "/cart"],
    },
    host: "https://withdamda.kr",
    sitemap: "https://withdamda.kr/sitemap.xml",
  };
}
