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

// 사업주 콘솔의 상품 노출 변경을 메인 화면에 즉시 반영합니다.
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
};

export default async function Home() {
  const [businesses, landingReviews] = await Promise.all([
    getPopularBusinessOwners(),
    getLandingReviews(30),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
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
