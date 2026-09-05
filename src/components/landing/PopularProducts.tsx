import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessOwnerCard } from "@/components/businesses";
import type { BusinessOwnerShowcase } from "@/services/productService";
import { HorizontalCarousel } from "./HorizontalCarousel";

interface PopularProductsProps {
  businesses: BusinessOwnerShowcase[];
  isAuthenticated: boolean;
}

export function PopularProducts({ businesses, isAuthenticated }: PopularProductsProps) {
  if (!isAuthenticated) {
    return (
      <section id="products" className="bg-secondary/30 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">검증된 체험 사업장</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            담다는 승인된 회원만 체험 사업장과 프로그램 정보를 확인할 수 있는 폐쇄형 예약 플랫폼입니다.
          </p>
          <Button asChild className="mt-7">
            <Link href="/login">로그인하고 체험 상품 보기</Link>
          </Button>
        </div>
      </section>
    );
  }

  const publicBusinesses = businesses
    .filter((business) => !/테스트|test/i.test(business.name))
    .map((business) => {
      const publicProducts = business.products.filter((product) => !/테스트|test/i.test(product.name));
      return {
        ...business,
        products: publicProducts,
        product_count: publicProducts.length,
        featured_product: publicProducts[0],
        min_sale_price: publicProducts.length
          ? Math.min(...publicProducts.map((product) => product.sale_price))
          : 0,
      };
    })
    .filter((business) => Boolean(business.featured_product));

  return (
    <section id="products" className="bg-secondary/30 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">인기 체험 업체</h2>
            <p className="text-lg text-muted-foreground">
              실제 등록된 다양한 체험 사업장을 한눈에 확인해 보세요.
            </p>
          </div>
          <Button variant="outline" asChild className="hidden md:flex">
            <Link href="/products">
              전체 보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {publicBusinesses.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border bg-white">
            <p className="text-muted-foreground">등록된 체험 업체가 없습니다.</p>
          </div>
        ) : (
          <HorizontalCarousel
            ariaLabel="제휴 업체"
            desktopItems={4}
          >
            {publicBusinesses.map((business) => (
              <BusinessOwnerCard
                key={business.id}
                owner={business}
                showPrice={false}
                showLogo={false}
                showProductName={false}
                showPublicDetails={false}
              />
            ))}
          </HorizontalCarousel>
        )}

        <div className="mt-8 flex justify-center md:hidden">
          <Button variant="outline" asChild>
            <Link href="/products">
              전체 업체 보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
