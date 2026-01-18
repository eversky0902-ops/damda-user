import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  getProductDetail,
  getProductReviews,
  getProductReviewStats,
  getProductsByCategory,
} from "@/services/productService";
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
  const product = await getProductDetail(id);

  if (!product) {
    return { title: "상품을 찾을 수 없습니다 | 담다" };
  }

  return {
    title: `${product.name} | 담다`,
    description: product.summary || product.name,
    openGraph: {
      title: product.name,
      description: product.summary || product.name,
      images: [product.thumbnail],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;

  const [product, reviewsResult, reviewStats] = await Promise.all([
    getProductDetail(id),
    getProductReviews(id, 1, 5),
    getProductReviewStats(id),
  ]);

  if (!product) {
    notFound();
  }

  // 연관 상품 (같은 카테고리)
  const relatedProducts = product.category_id
    ? await getProductsByCategory(product.category_id, 4)
    : [];

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
              <ReservationNotice />
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

function ReservationNotice() {
  return (
    <div className="prose prose-gray max-w-none">
      <h3>예약 안내</h3>
      <ul>
        <li>예약은 체험일 기준 최소 3일 전까지 가능합니다.</li>
        <li>인원 변경은 체험일 기준 2일 전까지 가능합니다.</li>
        <li>체험 당일 취소 및 노쇼(No-Show) 시 환불이 불가합니다.</li>
      </ul>

      <h3>취소 및 환불 정책</h3>
      <table>
        <thead>
          <tr>
            <th>취소 시점</th>
            <th>환불 금액</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>체험일 7일 전까지</td>
            <td>전액 환불</td>
          </tr>
          <tr>
            <td>체험일 3~6일 전</td>
            <td>결제 금액의 70% 환불</td>
          </tr>
          <tr>
            <td>체험일 1~2일 전</td>
            <td>결제 금액의 50% 환불</td>
          </tr>
          <tr>
            <td>체험 당일</td>
            <td>환불 불가</td>
          </tr>
        </tbody>
      </table>

      <h3>유의사항</h3>
      <ul>
        <li>기상 악화 등 불가피한 사유로 체험이 취소될 경우 전액 환불됩니다.</li>
        <li>체험 장소 및 시간은 사전 안내 없이 변경될 수 있습니다.</li>
        <li>체험 중 발생한 안전사고에 대해 당사는 책임지지 않습니다.</li>
        <li>어린이집 인솔 교사가 반드시 동행해야 합니다.</li>
      </ul>
    </div>
  );
}
