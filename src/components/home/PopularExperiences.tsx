import Link from "next/link";
import { BusinessOwnerCard } from "@/components/businesses";
import { getPopularBusinessOwners } from "@/services/productService";

export async function PopularExperiences() {
  const owners = await getPopularBusinessOwners(5);

  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">인기 체험 업체</h2>
          <p className="mt-1 text-gray-500">
            업체를 선택하고 등록된 여러 체험 상품을 한 번에 확인하세요.
          </p>
        </div>

        {owners.length === 0 ? (
          <div className="rounded-xl border border-gray-100 py-12 text-center text-gray-500">
            노출 중인 체험 업체가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {owners.map((owner) => (
              <BusinessOwnerCard key={owner.id} owner={owner} />
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/products"
            className="block w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:border-damda-yellow hover:bg-damda-yellow hover:text-gray-900"
          >
            전체 상품 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
