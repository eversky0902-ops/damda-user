import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "@/providers";
import { FloatingChatButton } from "@/components/common/FloatingChatButton";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://withdamda.kr"),
  title: {
    default: "담다 - 어린이집 현장체험 예약",
    template: "%s | 담다",
  },
  description:
    "국공립 어린이집을 위한 현장체험 상품 예약 플랫폼. 다양한 체험학습 프로그램을 손쉽게 검색하고 예약하세요.",
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
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "담다 - 어린이집 현장체험 예약 플랫폼",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
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
        <NextTopLoader color="#F8B737" showSpinner={false} />
        <Providers>
          {children}
          <FloatingChatButton />
        </Providers>
      </body>
    </html>
  );
}
