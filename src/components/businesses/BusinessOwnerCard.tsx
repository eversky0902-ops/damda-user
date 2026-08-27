import Image from "next/image";
import Link from "next/link";
import { MapPin, Package } from "lucide-react";
import type { BusinessOwnerShowcase } from "@/services/productService";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800&q=80";

interface BusinessOwnerCardProps {
  owner: BusinessOwnerShowcase;
  href?: string;
  showPrice?: boolean;
}

export function BusinessOwnerCard({ owner, href, showPrice = true }: BusinessOwnerCardProps) {
  const destination = href ?? `/businesses/${owner.id}`;
  const image = owner.featured_product.thumbnail || owner.logo_url || DEFAULT_IMAGE;
  const maxDiscountRate = owner.products.reduce((maximum, product) => {
    if (product.original_price <= 0 || product.sale_price >= product.original_price) return maximum;
    const discountRate = Math.round(((product.original_price - product.sale_price) / product.original_price) * 100);
    return Math.max(maximum, discountRate);
  }, 0);

  return (
    <Link
      href={destination}
      className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <Image
          src={image}
          alt={owner.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-center gap-3">
          {owner.logo_url && (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-white">
              <Image src={owner.logo_url} alt="" fill className="object-contain p-1" sizes="40px" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900 group-hover:text-primary">
              {owner.name}
            </h3>
            <p className="truncate text-sm text-gray-500">
              {owner.featured_product.name}
              {owner.product_count > 1 ? ` 외 ${owner.product_count - 1}개` : ""}
            </p>
          </div>
        </div>

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
          <strong className="shrink-0 text-gray-900">
            {showPrice ? `${owner.min_sale_price.toLocaleString()}원부터` : `최대 ${maxDiscountRate}% 할인`}
          </strong>
        </div>
      </div>
    </Link>
  );
}
