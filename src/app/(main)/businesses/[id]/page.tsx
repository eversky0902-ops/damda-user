import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, Package } from "lucide-react";
import { ProductGrid } from "@/components/products/ProductGrid";
import {
  getBusinessOwnerById,
  getProductsByBusinessOwner,
} from "@/services/productService";

interface BusinessOwnerPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BusinessOwnerPageProps) {
  const { id } = await params;
  const owner = await getBusinessOwnerById(id);
  return owner
    ? { title: `${owner.name} | 담다`, description: `${owner.name}의 체험 상품을 확인하세요.` }
    : { title: "업체를 찾을 수 없습니다 | 담다" };
}

export default async function BusinessOwnerPage({ params }: BusinessOwnerPageProps) {
  const { id } = await params;
  const [owner, products] = await Promise.all([
    getBusinessOwnerById(id),
    getProductsByBusinessOwner(id),
  ]);

  if (!owner) notFound();

  const region = products.find((product) => product.region)?.region;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <nav className="flex items-center text-sm text-gray-500">
            <Link href="/home" className="hover:text-gray-900">홈</Link>
            <ChevronRight className="mx-2 h-4 w-4" />
            <span className="font-medium text-gray-900">{owner.name}</span>
          </nav>
        </div>
      </div>

      <section className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-8">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-white">
            {owner.logo_url ? (
              <Image src={owner.logo_url} alt={owner.name} fill className="object-contain p-2" sizes="80px" />
            ) : (
              <div className="flex h-full items-center justify-center bg-damda-yellow/20">
                <Package className="h-8 w-8 text-gray-500" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{owner.name}</h1>
            <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              {region || owner.address || "체험 업체"}
            </p>
            <p className="mt-1 text-sm text-gray-500">등록 상품 {products.length}개</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">이 업체의 상품</h2>
          <p className="mt-1 text-gray-500">원하는 상품을 선택해 상세 정보와 예약 가능 일정을 확인하세요.</p>
        </div>
        <ProductGrid products={products} />
      </main>
    </div>
  );
}
