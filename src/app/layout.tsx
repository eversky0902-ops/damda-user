import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "@/providers";
import { FloatingChatButton } from "@/components/common/FloatingChatButton";
import { NaverAnalytics } from "@/components/common/NaverAnalytics";
import { landingFaqItems } from "@/components/landing/LandingFAQ";
import "./globals.css";

const homeStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://withdamda.kr/#organization",
    name: "담다",
    url: "https://withdamda.kr/",
    logo: "https://withdamda.kr/logo.svg",
    description: "어린이집·유치원을 위한 현장체험 프로그램 검색 및 예약 플랫폼",
    email: "damda_0001@naver.com",
    telephone: "+82-10-7625-3711",
    address: {
      "@type": "PostalAddress",
      streetAddress: "컨벤시아대로 81, 5층 509호-175A호",
      addressLocality: "연수구",
      addressRegion: "인천광역시",
      addressCountry: "KR",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://withdamda.kr/#website",
    url: "https://withdamda.kr/",
    name: "담다",
    alternateName: "담다 현장체험 예약",
    inLanguage: "ko-KR",
    publisher: { "@id": "https://withdamda.kr/#organization" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: landingFaqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  },
];

export const metadata: Metadata = {
  metadataBase: new URL("https://withdamda.kr"),
  title: {
    default: "담다 | 어린이집·유치원 현장체험학습 예약 플랫폼",
    template: "%s | 담다",
  },
  description:
    "담다는 어린이집·유치원을 위한 현장체험학습 예약 플랫폼입니다. 검증된 체험학습 업체와 프로그램을 지역별로 비교하고 간편하게 예약하세요.",
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
    title: "담다 | 어린이집·유치원 현장체험학습 예약 플랫폼",
    description:
      "검증된 현장체험 업체와 어린이집·유치원 맞춤 프로그램을 한 곳에서 비교하고 예약하세요.",
    images: [
      {
        url: "/og-image.png?v=20260828-2",
        width: 1200,
        height: 630,
        alt: "담다 - 어린이집, 유치원 현장체험학습 예약 플랫폼",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(homeStructuredData).replace(/</g, "\\u003c"),
          }}
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
