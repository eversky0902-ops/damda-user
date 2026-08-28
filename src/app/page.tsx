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
import { landingFaqItems } from "@/components/landing/LandingFAQ";

// 사업주 콘솔의 상품 노출 변경을 메인 화면에 즉시 반영합니다.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: {
    absolute: "어린이집 단체체험학습·현장체험 예약 | 담다",
  },
  description:
    "지역·연령·참여 인원에 맞는 어린이집 단체체험학습 프로그램을 비교하고 일정 확인부터 예약·결제까지 한 번에 진행하세요.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "어린이집 단체체험학습·현장체험 예약 | 담다",
    description:
      "지역·연령·참여 인원에 맞는 어린이집 단체체험학습 프로그램을 비교하고 일정 확인부터 예약·결제까지 한 번에 진행하세요.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://withdamda.kr/#organization",
  name: "담다",
  url: "https://withdamda.kr/",
  logo: "https://withdamda.kr/logo.svg",
  description:
    "어린이집·유치원을 위한 현장체험 프로그램 검색 및 예약 플랫폼",
  email: "damda_0001@naver.com",
  telephone: "+82-10-7625-3711",
  address: {
    "@type": "PostalAddress",
    streetAddress: "컨벤시아대로 81, 5층 509호-175A호",
    addressLocality: "연수구",
    addressRegion: "인천광역시",
    addressCountry: "KR",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://withdamda.kr/#website",
  url: "https://withdamda.kr/",
  name: "담다",
  alternateName: "담다 현장체험 예약",
  inLanguage: "ko-KR",
  publisher: { "@id": "https://withdamda.kr/#organization" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: landingFaqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default async function Home() {
  const [businesses, landingReviews] = await Promise.all([
    getPopularBusinessOwners(),
    getLandingReviews(30),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationJsonLd, websiteJsonLd, faqJsonLd]).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <main className="flex-1">
        <Hero />
        <ExperienceExplorer />
        <PopularProducts businesses={businesses} />
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
