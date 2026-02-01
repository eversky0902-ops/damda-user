"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Calendar, X } from "lucide-react";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
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
  const currentRegion = searchParams.get("region") || "";
  const currentDate = searchParams.get("date") || "";

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

  const handleRemoveFilter = (filterKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(filterKey);
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  };

  // 현재 선택된 카테고리 이름
  const selectedCategory = mainCategories.find((c) => c.id === currentCategory);

  // 날짜 포맷팅
  const formatDateDisplay = (dateStr: string) => {
    try {
      const date = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(date, "M월 d일 (E)", { locale: ko });
    } catch {
      return dateStr;
    }
  };

  const hasFilters = selectedCategory || currentRegion || currentDate;

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[92px] z-10">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 좌측: 필터 태그 + 결과 수 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 지역 필터 태그 */}
            {currentRegion && (
              <button
                onClick={() => handleRemoveFilter("region")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-damda-yellow-light text-gray-700 text-sm rounded-full border border-damda-yellow hover:bg-damda-yellow transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                {currentRegion}
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            )}

            {/* 날짜 필터 태그 */}
            {currentDate && (
              <button
                onClick={() => handleRemoveFilter("date")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-damda-yellow-light text-gray-700 text-sm rounded-full border border-damda-yellow hover:bg-damda-yellow transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                {formatDateDisplay(currentDate)}
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            )}

            {/* 선택된 카테고리 태그 */}
            {selectedCategory && (
              <button
                onClick={() => handleCategoryChange("")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200 hover:bg-gray-200 transition-colors"
              >
                {selectedCategory.name}
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            )}

            {/* 필터 없을 때 */}
            {!hasFilters && (
              <span className="text-sm text-gray-500">전체</span>
            )}

            {/* 결과 수 */}
            <span className="text-sm text-gray-500 ml-1">
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
