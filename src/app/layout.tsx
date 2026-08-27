import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "@/providers";
import { FloatingChatButton } from "@/components/common/FloatingChatButton";
import { NaverAnalytics } from "@/components/common/NaverAnalytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://withdamda.kr"),
  title: {
    default: "담다 | 어린이집·유치원 현장체험 예약 플랫폼",
    template: "%s | 담다",
  },
  description:
    "담다는 어린이집·유치원을 위한 현장체험 예약 플랫폼입니다. 검증된 체험학습 업체와 프로그램을 지역별로 비교하고 간편하게 예약하세요.",
  keywords: [
    "어린이집",
    "현장체험",
    "체험학습",
    "예약",
    "담다",
    "국공립어린이집",
    "유아체험",
    "현장학습",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "담다",
    title: "담다 | 어린이집·유치원 현장체험 예약 플랫폼",
    description:
      "검증된 현장체험 업체와 어린이집·유치원 맞춤 프로그램을 한 곳에서 비교하고 예약하세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "담다 - 어린이집 현장체험 예약 플랫폼",
      },
    ],
  },
  verification: {
    other: {
      "naver-site-verification": "2591ee86241d6a99606938d6dc1bc2494c45f1d2",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  category: "어린이집·유치원 현장체험 예약",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="font-pretendard antialiased bg-white">
        <NaverAnalytics />
        <NextTopLoader color="#F8B737" showSpinner={false} />
        <Providers>
          {children}
          <FloatingChatButton />
        </Providers>
      </body>
    </html>
  );
}
