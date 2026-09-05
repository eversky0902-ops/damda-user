import {
  Header,
  Hero,
  ExperienceExplorer,
  Features,
  HowItWorks,
  PopularProducts,
  GroupBookingChecklist,
  Reviews,
  LandingFAQ,
  CTASection,
  Footer,
} from "@/components/landing";
import type { Metadata } from "next";
import { getPopularBusinessOwners } from "@/services/productService";
import { getLandingReviews } from "@/services/reviewService";
import { createClient } from "@/lib/supabase/server";
import { landingFaqItems } from "@/components/landing/LandingFAQ";

// 담다 비즈니스센터의 상품 노출 변경을 메인 화면에 즉시 반영합니다.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: {
    absolute: "담다 | 어린이집·유치원 현장체험학습 예약 플랫폼",
  },
  description:
    "검증된 체험학습 프로그램을 간편하게 예약하고, 아이들에게 잊지 못할 추억을 선물하세요.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "담다 | 어린이집·유치원 현장체험학습 예약 플랫폼",
    description: "검증된 체험학습 프로그램을 간편하게 예약하고, 아이들에게 잊지 못할 추억을 선물하세요.",
    images: [
      {
        url: "/og-image.png?v=20260828-2",
        width: 1200,
        height: 630,
        alt: "담다 - 어린이집, 유치원 현장체험학습 예약 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "담다 | 어린이집·유치원 현장체험학습 예약 플랫폼",
    description: "검증된 체험학습 프로그램을 간편하게 예약하고, 아이들에게 잊지 못할 추억을 선물하세요.",
    images: ["/og-image.png?v=20260828-2"],
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

const homeStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://withdamda.kr/#organization",
    name: "담다",
    url: "https://withdamda.kr/",
    logo: "https://withdamda.kr/logo.svg",
    description: "어린이집·유치원을 위한 현장체험 프로그램 검색 및 예약 플랫폼",
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

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [businesses, landingReviews] = user
    ? await Promise.all([getPopularBusinessOwners(), getLandingReviews(30)])
    : [[], []];

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <main className="flex-1">
        <Hero />
        <ExperienceExplorer />
        <PopularProducts businesses={businesses} isAuthenticated={Boolean(user)} />
        <GroupBookingChecklist />
        <Features />
        <HowItWorks />
        <Reviews actualReviews={landingReviews} />
        <LandingFAQ />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
