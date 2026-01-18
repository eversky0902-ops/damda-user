"use client";

import Link from "next/link";
import { Utensils, Shield, Bus } from "lucide-react";

const promotions = [
  {
    icon: Utensils,
    tagline: "아이들의 영양소는 우리가 지킨다!",
    title: "도시락 업체 선정",
    href: "/promotion/lunchbox",
  },
  {
    icon: Shield,
    tagline: "안전 수칙 잘 지킵시다!",
    title: "검증된 체육 지도사",
    href: "/promotion/instructor",
  },
  {
    icon: Bus,
    tagline: "이동은 우리에게 맡겨라!",
    title: '이동 플랫폼 "타다"',
    href: "/promotion/tada",
  },
];

export function PromotionCards() {
  return (
    <section className="py-6 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {promotions.map((promo) => (
            <Link
              key={promo.title}
              href={promo.href}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-damda-yellow to-damda-yellow-light p-5 group hover:shadow-lg transition-shadow"
            >
              <div className="relative z-10">
                <p className="text-xs text-damda-yellow-dark mb-1">{promo.tagline}</p>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{promo.title}</h3>
                <span className="inline-block px-3 py-1.5 bg-damda-yellow-dark text-white text-sm font-medium rounded-full">
                  바로가기
                </span>
              </div>
              {/* Icon decoration */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                <promo.icon className="w-20 h-20 text-damda-yellow-dark" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
