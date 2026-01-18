import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getSubBanners } from "@/services/bannerService";

export async function PromotionBanners() {
  const banners = await getSubBanners();

  return (
    <section className="py-10 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 첫 번째 배너 - 담다 소개 */}
          <Link
            href={banners[0]?.link_url || "/about"}
            className="relative overflow-hidden rounded-2xl group hover:shadow-lg transition-shadow h-[160px]"
          >
            <Image
              src={banners[0]?.image_url || "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80"}
              alt={banners[0]?.title || "담다 소개"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 p-6 flex flex-col justify-center">
              <h3 className="text-xl font-bold text-white mb-1">
                선생님 반가워요!
              </h3>
              <p className="text-sm text-white/80 mb-3">
                "담다"에 대해 더 자세하게 알려드릴까요?
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-damda-yellow">
                "담다" 알아보기 <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          {/* 두 번째 배너 - 이벤트 모음 */}
          <Link
            href={banners[1]?.link_url || "/events"}
            className="relative overflow-hidden rounded-2xl group hover:shadow-lg transition-shadow h-[160px]"
          >
            <Image
              src={banners[1]?.image_url || "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&q=80"}
              alt={banners[1]?.title || "이벤트"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 p-6 flex flex-col justify-center">
              <h3 className="text-xl font-bold text-white mb-1">
                "담다"에서 진행하는 이벤트 모음
              </h3>
              <p className="text-sm text-white/80 mb-3">
                놓치면 손해입니다~
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-damda-yellow">
                이벤트 모아보기 <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
