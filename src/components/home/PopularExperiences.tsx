import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { getPopularProducts, type Product } from "@/services/productService";

// 상품용 기본 이미지
const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&q=80";

export async function PopularExperiences() {
  const products = await getPopularProducts(5);

  return (
    <section className="py-10 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">인기체험지</h2>
          <p className="text-gray-500 mt-1">아이들에게 소중한 추억을 선물하세요.</p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* View all button */}
        <div className="mt-8">
          <Link
            href="/products"
            className="block w-full py-3 text-center text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-damda-yellow hover:border-damda-yellow hover:text-gray-900 transition-colors"
          >
            전체보기
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const discountPercent = product.original_price > 0
    ? Math.round((1 - product.sale_price / product.original_price) * 100)
    : 0;

  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-gray-100">
        <Image
          src={product.thumbnail || DEFAULT_PRODUCT_IMAGE}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 50vw, 20vw"
        />
        {/* Region tag */}
        {product.region && (
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-green-500 text-white text-[10px] px-2 py-0.5">
              {product.region}
            </Badge>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-800 group-hover:text-primary transition-colors line-clamp-2">
        {product.name}
      </h3>
      <div className="flex items-center gap-2 mt-1">
        {discountPercent > 0 && (
          <span className="text-sm font-bold text-red-500">{discountPercent}%</span>
        )}
        <span className="text-sm font-bold text-gray-900">
          {product.sale_price.toLocaleString()}원
        </span>
      </div>
    </Link>
  );
}
