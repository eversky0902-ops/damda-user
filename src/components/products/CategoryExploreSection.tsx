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
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <h2 className="text-lg md:text-xl font-bold text-gray-900 text-center mb-8">
          다른 체험학습도 구경해보세요!
        </h2>

        {/* 카테고리 버튼 그리드 */}
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {mainCategories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.id}`}
              className="px-5 py-2.5 border border-gray-200 rounded-full text-sm text-gray-700 hover:border-damda-yellow hover:bg-damda-yellow-light transition-colors"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
