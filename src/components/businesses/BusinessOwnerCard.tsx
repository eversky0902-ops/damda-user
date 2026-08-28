import Image from "next/image";
import Link from "next/link";
import { getBusinessHref } from "@/lib/businessRouting";
import { Baby, Clock3, ImageOff, MapPin, Package, Users } from "lucide-react";
import type { BusinessOwnerShowcase } from "@/services/productService";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800&q=80";

interface BusinessOwnerCardProps {
  owner: BusinessOwnerShowcase;
  href?: string;
  showPrice?: boolean;
  showLogo?: boolean;
  showProductName?: boolean;
  showPublicDetails?: boolean;
}

function formatAge(owner: BusinessOwnerShowcase): string | null {
  const product = owner.featured_product;
  if (!product) return null;
  const minimum = product.recommended_age_min ?? product.minimum_age;
  const maximum = product.recommended_age_max;
  if (minimum != null && maximum != null) return `권장 ${minimum}~${maximum}세`;
  if (minimum != null) return `권장 ${minimum}세 이상`;
  if (maximum != null) return `권장 ${maximum}세 이하`;
  return null;
}

function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `약 ${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `약 ${hours}시간 ${remainder}분` : `약 ${hours}시간`;
}

function formatParticipants(owner: BusinessOwnerShowcase): string | null {
  const product = owner.featured_product;
  if (!product) return null;
  if (product.min_participants > 0 && product.max_participants > 0) {
    return `${product.min_participants}~${product.max_participants}명`;
  }
  if (product.max_participants > 0) return `최대 ${product.max_participants}명`;
  if (product.min_participants > 0) return `최소 ${product.min_participants}명`;
  return null;
}

export function BusinessOwnerCard({
  owner,
  href,
  showPrice = true,
  showLogo = true,
  showProductName = true,
  showPublicDetails = false,
}: BusinessOwnerCardProps) {
  const destination = href ?? getBusinessHref(owner.id);
  const image =
    owner.featured_product?.thumbnail || owner.logo_url || (showPublicDetails ? null : DEFAULT_IMAGE);
  const maxDiscountRate = owner.products.reduce((maximum, product) => {
    if (product.original_price <= 0 || product.sale_price >= product.original_price) return maximum;
    const discountRate = Math.round(((product.original_price - product.sale_price) / product.original_price) * 100);
    return Math.max(maximum, discountRate);
  }, 0);
  const publicFacts = owner.featured_product
    ? [
        { label: "권장 연령", value: formatAge(owner), icon: Baby },
        { label: "예상 소요 시간", value: formatDuration(owner.featured_product.duration_minutes), icon: Clock3 },
        { label: "예약 가능 인원", value: formatParticipants(owner), icon: Users },
      ].filter((fact): fact is { label: string; value: string; icon: typeof Baby } => Boolean(fact.value))
    : [];

  return (
    <Link
      href={destination}
      className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {image ? (
          <Image
            src={image}
            alt={owner.featured_product ? `${owner.name} ${owner.featured_product.name} 대표 이미지` : `${owner.name} 대표 이미지`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-gray-500">
            <ImageOff className="h-8 w-8" aria-hidden="true" />
            <span>등록된 대표 이미지가 없습니다.</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-center gap-3">
          {showLogo && owner.logo_url && (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-white">
              <Image src={owner.logo_url} alt="" fill className="object-contain p-1" sizes="40px" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900 group-hover:text-primary">
              {owner.name}
            </h3>
            {showProductName && (
              <p className="truncate text-sm text-gray-500">
                {owner.featured_product ? (
                  <>
                    {owner.featured_product.name}
                    {owner.product_count > 1 ? ` 외 ${owner.product_count - 1}개` : ""}
                  </>
                ) : (
                  "체험 상품 준비 중"
                )}
              </p>
            )}
          </div>
        </div>

        {showPublicDetails && publicFacts.length > 0 && (
          <dl className="mb-3 grid gap-2 border-t border-gray-100 pt-3 text-xs text-gray-600 sm:grid-cols-2">
            {publicFacts.map((fact) => (
              <div key={fact.label} className="flex min-w-0 items-center gap-1.5">
                <fact.icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <dt className="sr-only">{fact.label}</dt>
                <dd className="truncate">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex min-w-0 items-center gap-1 text-gray-500">
            {owner.regions.length > 0 ? (
              <>
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{owner.regions[0]}</span>
              </>
            ) : (
              <>
                <Package className="h-4 w-4 shrink-0" />
                <span>체험 업체</span>
              </>
            )}
          </span>
          <strong className={`shrink-0 ${showPrice && owner.product_count > 0 ? "text-gray-900" : "text-red-500"}`}>
            {owner.product_count === 0
              ? "신규 등록"
              : showPrice
                ? `${owner.min_sale_price.toLocaleString()}원부터`
                : `최대 ${maxDiscountRate}% 할인`}
          </strong>
        </div>
      </div>
    </Link>
  );
}
