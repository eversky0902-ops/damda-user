import {
  Header,
  Hero,
  Features,
  HowItWorks,
  PopularProducts,
  Reviews,
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
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
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
          __html: JSON.stringify([organizationJsonLd, websiteJsonLd]).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <PopularProducts businesses={businesses} />
        <HowItWorks />
        <Reviews actualReviews={landingReviews} />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
