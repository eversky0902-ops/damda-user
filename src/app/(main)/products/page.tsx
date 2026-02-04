import { Suspense } from "react";
import { getProducts, getPopularProducts, getProductsByRegion, type ProductFilter } from "@/services/productService";
import { getCategoriesWithChildren } from "@/services/categoryService";
import { ProductsHeroBanner } from "@/components/products/ProductsHeroBanner";
import { ProductFilterBar } from "@/components/products/ProductFilterBar";
import { ProductGridWithWishlist } from "@/components/products/ProductGridWithWishlist";
import { Pagination } from "@/components/products/Pagination";
import { NearbyProductsSection } from "@/components/products/NearbyProductsSection";
import { PopularTop4Section } from "@/components/products/PopularTop4Section";
import { CategoryExploreSection } from "@/components/products/CategoryExploreSection";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    region?: string;
    sort?: string;
    page?: string;
    date?: string;
    availableOnly?: string;
    // 더보기 필터
    minPrice?: string;
    maxPrice?: string;
    durationMin?: string;
    durationMax?: string;
    participants?: string;
    minRating?: string;
  }>;
}

export const metadata = {
  title: "체험 상품 | 담다",
  description: "국공립 어린이집을 위한 다양한 현장체험 프로그램을 만나보세요.",
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const filter: ProductFilter = {
    categoryId: params.category,
    region: params.region,
    sortBy: (params.sort as ProductFilter["sortBy"]) || "recommended",
    availableOnly: params.availableOnly === "true",
    // 더보기 필터
    minPrice: params.minPrice ? parseInt(params.minPrice, 10) : undefined,
    maxPrice: params.maxPrice ? parseInt(params.maxPrice, 10) : undefined,
    durationMin: params.durationMin ? parseInt(params.durationMin, 10) : undefined,
    durationMax: params.durationMax ? parseInt(params.durationMax, 10) : undefined,
    participants: params.participants ? parseInt(params.participants, 10) : undefined,
    minRating: params.minRating ? parseFloat(params.minRating) : undefined,
    // 날짜 필터 (1일 1예약: 해당 날짜에 예약 가능한 상품만)
    date: params.date,
  };

  const page = parseInt(params.page || "1", 10);
  const pageSize = 9; // 3열 그리드에 맞게 9개

  // 검색 지역 (기본값: 서울) - 다중 지역 중 첫 번째 사용
  const regions = params.region?.split(",").filter(Boolean) || [];
  const searchRegion = regions[0] || "서울";

  // 병렬로 데이터 fetching
  const [productsResult, categories, popularProducts, regionProducts] = await Promise.all([
    getProducts(filter, page, pageSize),
    getCategoriesWithChildren(),
    getPopularProducts(4),
    getProductsByRegion(searchRegion, 4),
  ]);

  // 현재 선택된 카테고리 찾기
  const selectedCategory = categories.find((c) => c.id === params.category);

  // 배너용 상위 카테고리 찾기 (depth=1 카테고리의 banner_url 사용)
  const findRootCategory = (categoryId: string | undefined): typeof selectedCategory => {
    if (!categoryId) return undefined;
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return undefined;
    if (category.depth === 1) return category;
    if (category.parent_id) return findRootCategory(category.parent_id);
    return category;
  };
  const rootCategory = findRootCategory(params.category);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 히어로 배너 */}
      <Suspense fallback={<HeroBannerSkeleton />}>
        <ProductsHeroBanner
          categoryName={rootCategory?.name || selectedCategory?.name}
          categoryBannerUrl={rootCategory?.banner_url ?? undefined}
        />
      </Suspense>

      {/* 필터/정렬 바 */}
      <Suspense fallback={<FilterSkeleton />}>
        <ProductFilterBar
          categories={categories}
          totalCount={productsResult.total}
        />
      </Suspense>

      {/* 상품 그리드 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGridWithWishlist products={productsResult.data} />
        </Suspense>

        {/* 페이지네이션 */}
        {productsResult.totalPages > 1 && (
          <div className="mt-12">
            <Pagination
              currentPage={productsResult.page}
              totalPages={productsResult.totalPages}
            />
          </div>
        )}
      </div>

      {/* 지역 기반 체험장 추천 */}
      <NearbyProductsSection products={regionProducts} region={searchRegion} />

      {/* 인기 체험장 TOP 4 */}
      <PopularTop4Section products={popularProducts} />

      {/* 카테고리 탐색 */}
      <CategoryExploreSection categories={categories} />
    </div>
  );
}

function HeroBannerSkeleton() {
  return (
    <div className="h-[280px] md:h-[320px] bg-gray-200 animate-pulse" />
  );
}

function FilterSkeleton() {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-[160px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[140px]" />
        </div>
      </div>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100">
          <Skeleton className="aspect-[4/3]" />
          <div className="p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-full mb-1" />
            <Skeleton className="h-5 w-3/4 mb-3" />
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
