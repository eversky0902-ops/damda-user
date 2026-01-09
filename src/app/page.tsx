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
import { getPopularProducts } from "@/services/productService";

export default async function Home() {
  const products = await getPopularProducts(8);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <PopularProducts products={products} />
        <HowItWorks />
        <Reviews />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
