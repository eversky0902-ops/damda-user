"use client";

import Link from "next/link";
import type { Category } from "@/services/categoryService";

interface CategoryExploreSectionProps {
  categories: Category[];
}

export function CategoryExploreSection({ categories }: CategoryExploreSectionProps) {
  // 1차 카테고리만 필터
  const mainCategories = categories.filter((c) => !c.parent_id);

  if (mainCategories.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-8 text-center">
          다른 체험학습도 <span className="text-damda-yellow-dark">구경해보세요!</span>
        </h2>

        {/* 데스크탑: 2줄 균등 배치 */}
        <div
          className="hidden md:grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.ceil(mainCategories.length / 2)}, 1fr)`,
          }}
        >
          {mainCategories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.id}`}
              className="px-4 py-3 bg-white border border-gray-200 rounded-full text-base font-medium text-gray-700 hover:border-damda-yellow hover:bg-damda-yellow-light hover:text-gray-900 transition-all text-center whitespace-nowrap"
            >
              {category.name}
            </Link>
          ))}
        </div>

        {/* 모바일: 3열 균등 배치 */}
        <div className="grid grid-cols-3 gap-2 md:hidden">
          {mainCategories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.id}`}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:border-damda-yellow hover:bg-damda-yellow-light hover:text-gray-900 transition-all text-center whitespace-nowrap"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
