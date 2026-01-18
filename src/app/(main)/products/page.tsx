import { Suspense } from "react";
import { getProducts, type ProductFilter } from "@/services/productService";
import { getCategoriesWithChildren } from "@/services/categoryService";
import { ProductFilter as ProductFilterComponent } from "@/components/products/ProductFilter";
import { ProductGridWithWishlist } from "@/components/products/ProductGridWithWishlist";
import { Pagination } from "@/components/products/Pagination";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    region?: string;
    sort?: string;
    page?: string;
    from?: string;
    to?: string;
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
    sortBy: (params.sort as ProductFilter["sortBy"]) || "newest",
  };

  const page = parseInt(params.page || "1", 10);
  const pageSize = 12;

  // 병렬로 데이터 fetching
  const [productsResult, categories] = await Promise.all([
    getProducts(filter, page, pageSize),
    getCategoriesWithChildren(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 필터 */}
      <Suspense fallback={<FilterSkeleton />}>
        <ProductFilterComponent
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
    </div>
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
