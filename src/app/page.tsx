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
import { getPopularBusinessOwners } from "@/services/productService";
import { getLandingReviews } from "@/services/reviewService";

// 사업주 콘솔의 상품 노출 변경을 메인 화면에 즉시 반영합니다.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
