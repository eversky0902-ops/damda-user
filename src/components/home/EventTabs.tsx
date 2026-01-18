"use client";

import Link from "next/link";

const tabs = [
  { label: "담다가 쏜다", href: "/event/damda-shot", highlight: true },
  { label: "DAMDA 드로우", href: "/event/draw", highlight: true },
  { label: "어린이집 쿠폰북", href: "/event/coupon", highlight: false },
  { label: "이벤트 더보기", href: "/event", highlight: false },
];

export function EventTabs() {
  return (
    <section className="py-6 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex gap-3">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex-1 py-3 px-4 text-center text-sm font-medium rounded-lg transition-colors ${
                tab.highlight
                  ? "bg-damda-yellow text-gray-900 hover:bg-damda-yellow-dark"
                  : "text-gray-700 border border-gray-200 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
