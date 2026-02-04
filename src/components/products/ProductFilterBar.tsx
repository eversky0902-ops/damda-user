"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Users, Clock, Star, Wallet } from "lucide-react";
import { ProductSortTabs } from "./ProductSortTabs";
import type { Category } from "@/services/categoryService";

interface ProductFilterBarProps {
  categories: Category[];
  totalCount: number;
}

// 더보기 필터 옵션
const PRICE_OPTIONS = [
  { value: "", label: "전체", min: undefined, max: undefined },
  { value: "0-10000", label: "1만원 이하", min: 0, max: 10000 },
  { value: "10000-30000", label: "1~3만원", min: 10000, max: 30000 },
  { value: "30000-50000", label: "3~5만원", min: 30000, max: 50000 },
  { value: "50000-", label: "5만원 이상", min: 50000, max: undefined },
];

const DURATION_OPTIONS = [
  { value: "", label: "전체", min: undefined, max: undefined },
  { value: "0-60", label: "1시간 이하", min: 0, max: 60 },
  { value: "60-120", label: "1~2시간", min: 60, max: 120 },
  { value: "120-", label: "2시간 이상", min: 120, max: undefined },
];

const RATING_OPTIONS = [
  { value: "", label: "전체", min: undefined },
  { value: "4", label: "4점 이상", min: 4 },
  { value: "3", label: "3점 이상", min: 3 },
];

export function ProductFilterBar({ categories, totalCount }: ProductFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") || "";

  // 바텀시트 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  // URL에서 현재 적용된 필터값
  const appliedMinPrice = searchParams.get("minPrice") || "";
  const appliedMaxPrice = searchParams.get("maxPrice") || "";
  const appliedDurationMin = searchParams.get("durationMin") || "";
  const appliedDurationMax = searchParams.get("durationMax") || "";
  const appliedParticipants = searchParams.get("participants") || "";
  const appliedMinRating = searchParams.get("minRating") || "";

  // 로컬 상태 (검색 버튼 누르기 전까지 임시 저장)
  const [localPriceOption, setLocalPriceOption] = useState("");
  const [localDurationOption, setLocalDurationOption] = useState("");
  const [localParticipants, setLocalParticipants] = useState("");
  const [localMinRating, setLocalMinRating] = useState("");

  // URL 파라미터에서 옵션값 계산
  const getAppliedPriceOption = () => {
    return PRICE_OPTIONS.find(
      (opt) =>
        (opt.min?.toString() || "") === appliedMinPrice &&
        (opt.max?.toString() || "") === appliedMaxPrice
    )?.value || "";
  };

  const getAppliedDurationOption = () => {
    return DURATION_OPTIONS.find(
      (opt) =>
        (opt.min?.toString() || "") === appliedDurationMin &&
        (opt.max?.toString() || "") === appliedDurationMax
    )?.value || "";
  };

  // 모달 열릴 때 현재 적용된 값으로 로컬 상태 초기화
  useEffect(() => {
    if (isModalOpen) {
      setLocalPriceOption(getAppliedPriceOption());
      setLocalDurationOption(getAppliedDurationOption());
      setLocalParticipants(appliedParticipants);
      setLocalMinRating(appliedMinRating);
    }
  }, [isModalOpen, appliedMinPrice, appliedMaxPrice, appliedDurationMin, appliedDurationMax, appliedParticipants, appliedMinRating]);

  // 모달 열릴 때 스크롤 방지
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

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

  // 검색 버튼 클릭 시 URL에 반영
  const applyMoreFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    // 가격
    const priceOption = PRICE_OPTIONS.find((opt) => opt.value === localPriceOption);
    if (priceOption?.min !== undefined) {
      params.set("minPrice", priceOption.min.toString());
    } else {
      params.delete("minPrice");
    }
    if (priceOption?.max !== undefined) {
      params.set("maxPrice", priceOption.max.toString());
    } else {
      params.delete("maxPrice");
    }

    // 소요시간
    const durationOption = DURATION_OPTIONS.find((opt) => opt.value === localDurationOption);
    if (durationOption?.min !== undefined) {
      params.set("durationMin", durationOption.min.toString());
    } else {
      params.delete("durationMin");
    }
    if (durationOption?.max !== undefined) {
      params.set("durationMax", durationOption.max.toString());
    } else {
      params.delete("durationMax");
    }

    // 인원수
    if (localParticipants) {
      params.set("participants", localParticipants);
    } else {
      params.delete("participants");
    }

    // 평점
    if (localMinRating) {
      params.set("minRating", localMinRating);
    } else {
      params.delete("minRating");
    }

    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
    setIsModalOpen(false);
  }, [router, searchParams, localPriceOption, localDurationOption, localParticipants, localMinRating]);

  // 초기화 (바로 URL 반영)
  const clearMoreFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("durationMin");
    params.delete("durationMax");
    params.delete("participants");
    params.delete("minRating");
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);

    // 로컬 상태도 초기화
    setLocalPriceOption("");
    setLocalDurationOption("");
    setLocalParticipants("");
    setLocalMinRating("");
    setIsModalOpen(false);
  }, [router, searchParams]);

  // 현재 선택된 카테고리 이름
  const selectedCategory = mainCategories.find((c) => c.id === currentCategory);

  // 더보기 필터 활성화 여부 (적용된 값 기준)
  const hasActiveMoreFilters = appliedMinPrice || appliedMaxPrice || appliedDurationMin || appliedDurationMax || appliedParticipants || appliedMinRating;
  const appliedPriceOption = getAppliedPriceOption();
  const appliedDurationOption = getAppliedDurationOption();
  const moreFilterCount = [appliedPriceOption, appliedDurationOption, appliedParticipants, appliedMinRating].filter(Boolean).length;

  return (
    <>
      <div className="bg-white border-b border-gray-200 sticky top-[92px] z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* 좌측: 카테고리 태그 + 더보기 + 결과 수 */}
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

              {/* 더보기 필터 버튼 */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  hasActiveMoreFilters
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>더보기</span>
                {moreFilterCount > 0 && (
                  <span className="flex items-center justify-center w-4 h-4 text-xs font-medium bg-amber-400 text-white rounded-full">
                    {moreFilterCount}
                  </span>
                )}
              </button>

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

      {/* 바텀시트 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* 바텀시트 */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white rounded-t-2xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">상세 필터</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 필터 내용 */}
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-130px)]">
              {/* 가격대 */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">가격대</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRICE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLocalPriceOption(opt.value)}
                      className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                        localPriceOption === opt.value
                          ? "bg-amber-400 border-amber-400 text-white font-medium"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 소요시간 */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">소요시간</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLocalDurationOption(opt.value)}
                      className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                        localDurationOption === opt.value
                          ? "bg-amber-400 border-amber-400 text-white font-medium"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 인원수 */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">인원수</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={localParticipants}
                    onChange={(e) => setLocalParticipants(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="인원 입력"
                    className="w-28 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500">명 수용 가능</span>
                </div>
              </div>

              {/* 평점 */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">평점</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLocalMinRating(opt.value)}
                      className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                        localMinRating === opt.value
                          ? "bg-amber-400 border-amber-400 text-white font-medium"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
              <button
                type="button"
                onClick={clearMoreFilters}
                className="flex-1 py-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={applyMoreFilters}
                className="flex-[2] py-3 text-sm font-medium text-white bg-amber-400 rounded-xl hover:bg-amber-500 transition-colors"
              >
                검색
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
