import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  getProductDetail,
  getProductReviews,
  getProductReviewStats,
  getProductsByCategory,
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

  // 연관 상품도 병렬로 fetch (위의 Promise.all과 별개로 빠르게 시작)
  const relatedProductsPromise = product.category_id
    ? getProductsByCategory(product.category_id, 5)
    : Promise.resolve([]);

  const relatedProducts = await relatedProductsPromise;

  // 현재 상품 제외
  const filteredRelated = relatedProducts.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-white">
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
            <ProductDetailInfo product={product} />
          </Suspense>
        </div>
      </div>

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
