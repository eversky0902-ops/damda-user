import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.withdamda.kr" }],
        destination: "https://withdamda.kr/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    // 로컬 개발 환경의 DNS64 주소가 Next.js에서 사설 IP로 오인되는 경우가 있어
    // 개발 중에는 브라우저가 Supabase 이미지를 직접 요청하도록 합니다.
    // Preview/Production에서는 기존 이미지 최적화를 그대로 사용합니다.
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "eifpjjoawsgdmeeuzhin.supabase.co",
      },
      {
        protocol: "https",
        hostname: "tcdvvslgfapjhqlicadx.supabase.co",
      },
    ],
  },
};

export default nextConfig;
