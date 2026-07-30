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

// 랜딩은 방문자 공통 콘텐츠 → ISR(5분)로 엣지 캐시. 데이터는 unstable_cache로 별도 갱신.
export const revalidate = 300;

export default async function Home() {
  const businesses = await getPopularBusinessOwners(8);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <PopularProducts businesses={businesses} />
        <HowItWorks />
        <Reviews />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
