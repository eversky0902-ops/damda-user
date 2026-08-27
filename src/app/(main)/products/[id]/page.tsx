import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  getProductDetail,
  getProductReviews,
  getProductReviewStats,
  getProductsByCategory,
  getProductsByBusinessOwner,
} from "@/services/productService";
import { getLatestLegalDocument } from "@/services/contentService";

// React cache로 중복 호출 방지
const getCachedProductDetail = cache(getProductDetail);
import { ImageGallery } from "@/components/products/ImageGallery";
import { ProductDetailInfo } from "@/components/products/ProductDetailInfo";
import { ProductDescription } from "@/components/products/ProductDescription";
import { ProductReviews } from "@/components/products/ProductReviews";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preview_token?: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getCachedProductDetail(id);

  if (!product) {
    return { title: "상품을 찾을 수 없습니다 | 담다" };
  }

  return {
    title: product.name,
    description: product.summary || product.name,
    openGraph: {
      title: product.name,
      description: product.summary || product.name,
      siteName: "담다",
      locale: "ko_KR",
      type: "article",
      images: [product.thumbnail],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;

  const headersList = await headers();
  const isPreview = headersList.get('x-preview-mode') === 'true';

  // 모든 데이터를 병렬로 fetch
  const [product, reviewsResult, reviewStats, reservationGuide] = await Promise.all([
    getCachedProductDetail(id),
    getProductReviews(id, 1, 5),
    getProductReviewStats(id),
    getLatestLegalDocument("reservation-guide"),
  ]);

  if (!product) {
    notFound();
  }

  // 같은 사업장의 등록 상품과 카테고리 연관 상품을 함께 조회합니다.
  const [businessProducts, relatedProducts] = await Promise.all([
    getProductsByBusinessOwner(product.business_id),
    product.category_id
      ? getProductsByCategory(product.category_id, 5)
      : Promise.resolve([]),
  ]);

  // 현재 상품 제외
  const filteredRelated = relatedProducts.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-white">
      {/* 미리보기 배너 */}
      {isPreview && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 py-3 text-center text-amber-800 text-sm font-medium">
            미리보기 모드 - 예약 기능은 비활성화되어 있습니다
          </div>
        </div>
      )}

      {/* 브레드크럼 */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center text-sm text-gray-500">
            <Link href="/home" className="hover:text-gray-700">
              홈
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <Link href="/products" className="hover:text-gray-700">
              체험 상품
            </Link>
            {product.category && (
              <>
                <ChevronRight className="w-4 h-4 mx-2" />
                <Link
                  href={`/products?category=${product.category.id}`}
                  className="hover:text-gray-700"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-gray-900 font-medium truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      {/* 상품 정보 영역 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* 이미지 갤러리 */}
          <Suspense fallback={<Skeleton className="aspect-[4/3] rounded-xl" />}>
            <ImageGallery
              images={product.images}
              thumbnail={product.thumbnail}
              productName={product.name}
            />
          </Suspense>

          {/* 상품 정보 */}
          <Suspense fallback={<ProductInfoSkeleton />}>
            <ProductDetailInfo product={product} isPreview={isPreview} />
          </Suspense>
        </div>
      </div>

      {/* 사업장에 등록된 전체 상품 */}
      {businessProducts.length > 0 && (
        <section className="border-t border-gray-200 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">사업장 등록 상품</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  {product.business_owner?.name || "이 사업장"}의 상품
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  상품별 이미지와 가격을 비교한 뒤 원하는 상품을 선택하세요.
                </p>
              </div>
              <span className="text-sm text-gray-500">총 {businessProducts.length}개</span>
            </div>
            <ProductGrid products={businessProducts} />
          </div>
        </section>
      )}

      {/* 탭 영역 */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Tabs defaultValue="description" className="space-y-8">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-damda-yellow data-[state=active]:bg-transparent px-6 py-3"
              >
                상세정보
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-damda-yellow data-[state=active]:bg-transparent px-6 py-3"
              >
                리뷰 ({reviewStats.totalCount})
              </TabsTrigger>
              <TabsTrigger
                value="notice"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-damda-yellow data-[state=active]:bg-transparent px-6 py-3"
              >
                예약안내
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-8">
              <ProductDescription
                description={product.description}
                address={product.address}
                addressDetail={product.address_detail}
              />
            </TabsContent>

            <TabsContent value="reviews" className="mt-8">
              <ProductReviews
                reviews={reviewsResult.data}
                stats={reviewStats}
                totalPages={reviewsResult.totalPages}
                hasMore={reviewsResult.totalPages > 1}
              />
            </TabsContent>

            <TabsContent value="notice" className="mt-8">
              <ReservationNotice content={reservationGuide?.content} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 연관 상품 */}
      {filteredRelated.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              이런 체험은 어떠세요?
            </h2>
            <ProductGrid products={filteredRelated} />
          </div>
        </div>
      )}
    </div>
  );
}

function ProductInfoSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-40 w-full" />
      <div className="flex gap-3">
        <Skeleton className="h-12 w-12" />
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 flex-1" />
      </div>
    </div>
  );
}

function ReservationNotice({ content }: { content?: string | null }) {
  if (!content) {
    return (
      <div className="text-center py-8 text-gray-500">
        예약안내가 등록되지 않았습니다.
      </div>
    );
  }

  return (
    <div
      className="legal-content text-sm text-gray-700 leading-relaxed [&>p]:mb-4 [&>p]:leading-relaxed [&>h1]:text-lg [&>h1]:font-bold [&>h1]:text-gray-900 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:text-base [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-6 [&>h2]:mb-3 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:text-gray-900 [&>h3]:mt-5 [&>h3]:mb-2 [&>ul]:my-3 [&>ul]:pl-5 [&>ul]:list-disc [&>ol]:my-3 [&>ol]:pl-5 [&>ol]:list-decimal [&>li]:mb-1 [&>br]:block [&>br]:content-[''] [&>br]:mb-4"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
