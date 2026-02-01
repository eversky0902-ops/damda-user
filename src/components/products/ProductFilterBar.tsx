"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ProductSortTabs } from "./ProductSortTabs";
import type { Category } from "@/services/categoryService";

interface ProductFilterBarProps {
  categories: Category[];
  totalCount: number;
}

export function ProductFilterBar({ categories, totalCount }: ProductFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") || "";

  // 1차 카테고리만 필터
  const mainCategories = categories.filter((c) => !c.parent_id);

  const handleCategoryChange = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId) {
      params.set("category", categoryId);
    } else {
      params.delete("category");
    }
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  };

  // 현재 선택된 카테고리 이름
  const selectedCategory = mainCategories.find((c) => c.id === currentCategory);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[92px] z-10">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 좌측: 카테고리 태그 + 결과 수 */}
          <div className="flex items-center gap-3">
            {/* 선택된 카테고리 태그 */}
            {selectedCategory ? (
              <button
                onClick={() => handleCategoryChange("")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200 hover:bg-gray-200 transition-colors"
              >
                {selectedCategory.name}
                <span className="text-gray-400">×</span>
              </button>
            ) : (
              <span className="text-sm text-gray-500">전체</span>
            )}

            {/* 결과 수 */}
            <span className="text-sm text-gray-500">
              총 <span className="font-semibold text-gray-900">{totalCount}</span>건
            </span>
          </div>

          {/* 우측: 정렬 탭 */}
          <ProductSortTabs />
        </div>

        {/* 모바일에서 카테고리 선택 드롭다운 */}
        <div className="sm:hidden mt-3">
          <select
            value={currentCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white"
          >
            <option value="">전체 카테고리</option>
            {mainCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
