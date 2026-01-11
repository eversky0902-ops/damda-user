"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  summary: string | null;
  thumbnail: string;
  original_price: number;
  sale_price: number;
  region: string | null;
  max_participants: number;
  view_count: number;
  business_owner?: {
    name: string;
  };
}

interface PopularProductsProps {
  products: Product[];
}

export function PopularProducts({ products }: PopularProductsProps) {
  const getDiscountRate = (original: number, sale: number) => {
    if (original <= sale) return 0;
    return Math.round(((original - sale) / original) * 100);
  };

  return (
    <section id="products" className="bg-secondary/30 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* Section header */}
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">
              인기 프로그램
            </h2>
            <p className="text-lg text-muted-foreground">
              다른 어린이집에서 많이 선택한 프로그램
            </p>
          </div>
          <Button variant="outline" asChild className="hidden md:flex">
            <Link href="/signup">
              전체보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {products.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border bg-white">
            <p className="text-muted-foreground">등록된 프로그램이 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => {
              const discountRate = getDiscountRate(
                product.original_price,
                product.sale_price
              );

              return (
                <Link key={product.id} href="/signup">
                  <div className="group overflow-hidden rounded-2xl border border-border/50 bg-white transition-shadow hover:shadow-lg">
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={product.thumbnail || "/placeholder-product.jpg"}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      {product.business_owner && (
                        <p className="mb-1 text-xs text-muted-foreground">
                          {product.business_owner.name}
                        </p>
                      )}
                      <h3 className="mb-2 line-clamp-2 font-semibold group-hover:text-primary">
                        {product.name}
                      </h3>

                      <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                        {product.region && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {product.region}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          최대 {product.max_participants}명
                        </span>
                      </div>

                      {discountRate > 0 && (
                        <div className="flex items-center">
                          <span className="text-lg font-bold text-red-500">
                            {discountRate}% 할인
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-8 flex justify-center md:hidden">
          <Button variant="outline" asChild>
            <Link href="/signup">
              전체 프로그램 보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
