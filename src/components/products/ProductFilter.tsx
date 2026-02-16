"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Calendar, MapPin, ChevronDown, Users, Clock, Star, Wallet } from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import "react-day-picker/style.css";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/services/categoryService";
import { REGION_GROUPS } from "@/constants/regionGroups";

// REGION_GROUPS에서 검색 가능한 항목 생성
// 각 항목: { label: 검색/표시 텍스트, value: URL 파라미터에 넣을 값 }
type RegionSearchItem = { label: string; value: string };

const REGION_SEARCH_ITEMS: RegionSearchItem[] = (() => {
  const items: RegionSearchItem[] = [];
  for (const [province, groups] of Object.entries(REGION_GROUPS)) {
    // 시/도 전체
    items.push({ label: province, value: province });
    // 각 그룹
    for (const group of groups) {
      const regionValues = group.districts.map(d => `${province} ${d}`).join(",");
      items.push({
        label: `${province} ${group.label}`,
        value: regionValues,
      });
    }
  }
  return items;
})();

interface ProductFilterProps {
  categories: Category[];
  totalCount: number;
}

const SORT_OPTIONS = [
  { value: "newest", label: "최신순" },
  { value: "price_low", label: "가격 낮은순" },
  { value: "price_high", label: "가격 높은순" },
];

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

export function ProductFilter({
  categories,
  totalCount,
}: ProductFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [isMoreFilterOpen, setIsMoreFilterOpen] = useState(false);
  const [regionInput, setRegionInput] = useState(searchParams.get("region") || "");
  const [filteredRegions, setFilteredRegions] = useState<string[]>([]);
  const calendarRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const moreFilterRef = useRef<HTMLDivElement>(null);

  const currentCategory = searchParams.get("category") || "";
  const currentRegion = searchParams.get("region") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  // 더보기 필터 현재값
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";
  const currentDurationMin = searchParams.get("durationMin") || "";
  const currentDurationMax = searchParams.get("durationMax") || "";
  const currentParticipants = searchParams.get("participants") || "";
  const currentMinRating = searchParams.get("minRating") || "";

  // 가격 옵션 현재 선택값 계산
  const currentPriceOption = PRICE_OPTIONS.find(
    (opt) =>
      (opt.min?.toString() || "") === currentMinPrice &&
      (opt.max?.toString() || "") === currentMaxPrice
  )?.value || "";

  // 소요시간 옵션 현재 선택값 계산
  const currentDurationOption = DURATION_OPTIONS.find(
    (opt) =>
      (opt.min?.toString() || "") === currentDurationMin &&
      (opt.max?.toString() || "") === currentDurationMax
  )?.value || "";

  // URL 파라미터에서 날짜 범위 파싱
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (fromDate) {
      return {
        from: parse(fromDate, "yyyy-MM-dd", new Date()),
        to: toDate ? parse(toDate, "yyyy-MM-dd", new Date()) : undefined,
      };
    }
    return undefined;
  });

  // 외부 클릭시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
      if (regionRef.current && !regionRef.current.contains(event.target as Node)) {
        setIsRegionOpen(false);
      }
      if (moreFilterRef.current && !moreFilterRef.current.contains(event.target as Node)) {
        setIsMoreFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 지역 검색 필터링
  const [filteredSearchItems, setFilteredSearchItems] = useState<RegionSearchItem[]>([]);

  useEffect(() => {
    if (regionInput.trim()) {
      const query = regionInput.toLowerCase();
      const filtered = REGION_SEARCH_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(query)
      );
      setFilteredSearchItems(filtered);
      setFilteredRegions(filtered.map(item => item.label));
      setIsRegionOpen(filtered.length > 0);
    } else {
      setFilteredSearchItems([]);
      setFilteredRegions([]);
      setIsRegionOpen(false);
    }
  }, [regionInput]);

  const handleRegionSelect = (selectedLabel: string) => {
    const item = filteredSearchItems.find(i => i.label === selectedLabel);
    const value = item?.value || selectedLabel;
    setRegionInput(selectedLabel);
    setIsRegionOpen(false);
    updateFilter("region", value);
  };

  const clearRegion = () => {
    setRegionInput("");
    updateFilter("region", "");
  };

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set("page", "1");
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams]
  );

  const updateDateFilter = useCallback(
    (range: DateRange | undefined) => {
      setDateRange(range);
      const params = new URLSearchParams(searchParams.toString());
      if (range?.from) {
        params.set("from", format(range.from, "yyyy-MM-dd"));
        if (range.to) {
          params.set("to", format(range.to, "yyyy-MM-dd"));
        } else {
          params.delete("to");
        }
      } else {
        params.delete("from");
        params.delete("to");
      }
      params.set("page", "1");
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = () => {
    router.push("/products");
    setDateRange(undefined);
    setRegionInput("");
  };

  // 더보기 필터 업데이트 함수
  const updateMoreFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      params.set("page", "1");
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handlePriceChange = (optionValue: string) => {
    const option = PRICE_OPTIONS.find((opt) => opt.value === optionValue);
    updateMoreFilters({
      minPrice: option?.min?.toString() || "",
      maxPrice: option?.max?.toString() || "",
    });
  };

  const handleDurationChange = (optionValue: string) => {
    const option = DURATION_OPTIONS.find((opt) => opt.value === optionValue);
    updateMoreFilters({
      durationMin: option?.min?.toString() || "",
      durationMax: option?.max?.toString() || "",
    });
  };

  const handleRatingChange = (optionValue: string) => {
    const option = RATING_OPTIONS.find((opt) => opt.value === optionValue);
    updateMoreFilters({
      minRating: option?.min?.toString() || "",
    });
  };

  const handleParticipantsChange = (value: string) => {
    const numValue = value.replace(/[^0-9]/g, "");
    updateMoreFilters({ participants: numValue });
  };

  const clearMoreFilters = () => {
    updateMoreFilters({
      minPrice: "",
      maxPrice: "",
      durationMin: "",
      durationMax: "",
      participants: "",
      minRating: "",
    });
  };

  const hasActiveFilters = currentCategory || currentRegion || fromDate;
  const hasActiveMoreFilters = currentMinPrice || currentMaxPrice || currentDurationMin || currentDurationMax || currentParticipants || currentMinRating;
  const moreFilterCount = [currentPriceOption, currentDurationOption, currentParticipants, currentMinRating].filter(Boolean).length;

  const getDateRangeText = () => {
    if (!dateRange?.from) return "날짜 선택";
    if (!dateRange.to) return format(dateRange.from, "M월 d일", { locale: ko });
    return `${format(dateRange.from, "M월 d일", { locale: ko })} - ${format(dateRange.to, "M월 d일", { locale: ko })}`;
  };

  // 1차 카테고리만 필터
  const mainCategories = categories.filter((c) => !c.parent_id);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[92px] z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* 필터 영역 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* 데스크톱 필터 */}
          <div className="hidden sm:flex items-center gap-3 flex-1">
            {/* 카테고리 */}
            <Select
              value={currentCategory || "all"}
              onValueChange={(v) => updateFilter("category", v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="전체 카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                {mainCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 지역 */}
            <div className="relative" ref={regionRef}>
              <div className="flex items-center gap-2 px-4 h-10 border border-gray-200 rounded-md bg-white min-w-[200px]">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={regionInput}
                  onChange={(e) => setRegionInput(e.target.value)}
                  onFocus={() => regionInput && setIsRegionOpen(filteredRegions.length > 0)}
                  placeholder="지역 검색"
                  className="flex-1 min-w-0 text-sm outline-none bg-transparent placeholder:text-gray-400"
                />
                {regionInput && (
                  <button
                    type="button"
                    onClick={clearRegion}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 지역 자동완성 드롭다운 */}
              {isRegionOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 max-h-[240px] overflow-y-auto">
                  {filteredRegions.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRegionSelect(r)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 날짜 */}
            <div className="relative" ref={calendarRef}>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="flex items-center gap-2 px-4 h-10 border border-gray-200 rounded-md hover:bg-gray-50 text-sm min-w-[160px]"
              >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className={dateRange?.from ? "text-gray-900" : "text-gray-500"}>
                  {getDateRangeText()}
                </span>
              </button>

              {/* 캘린더 팝오버 */}
              {isCalendarOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                  <style>{`
                    .calendar-filter .rdp-root {
                      --rdp-accent-color: #F8B737;
                      --rdp-accent-background-color: #FEF3C7;
                      --rdp-day-height: 36px;
                      --rdp-day-width: 36px;
                      --rdp-months-gap: 24px;
                      font-size: 14px;
                    }
                    .calendar-filter .rdp-months {
                      display: flex !important;
                      flex-wrap: nowrap !important;
                    }
                    .calendar-filter .rdp-day_button {
                      font-size: 14px;
                    }
                    .calendar-filter .rdp-caption_label {
                      font-size: 15px;
                      font-weight: 600;
                    }
                    .calendar-filter .rdp-weekday {
                      font-size: 12px;
                      color: #6b7280;
                    }
                    .calendar-filter .rdp-selected .rdp-day_button {
                      background-color: #F8B737;
                      color: #1f2937;
                    }
                    .calendar-filter .rdp-range_middle .rdp-day_button {
                      background-color: #FEF3C7;
                      color: #1f2937;
                    }
                  `}</style>
                  <div className="calendar-filter">
                    <DayPicker
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      locale={ko}
                      numberOfMonths={2}
                      disabled={{ before: new Date() }}
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        updateDateFilter(undefined);
                        setIsCalendarOpen(false);
                      }}
                      className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                    >
                      초기화
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateDateFilter(dateRange);
                        setIsCalendarOpen(false);
                      }}
                      className="px-3 py-1.5 text-sm bg-damda-yellow rounded-lg hover:bg-damda-yellow-dark"
                    >
                      적용
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 더보기 필터 */}
            <div className="relative" ref={moreFilterRef}>
              <button
                type="button"
                onClick={() => setIsMoreFilterOpen(!isMoreFilterOpen)}
                className={`flex items-center gap-2 px-4 h-10 border rounded-md hover:bg-gray-50 text-sm transition-colors ${
                  hasActiveMoreFilters
                    ? "border-damda-yellow bg-amber-50 text-amber-700"
                    : "border-gray-200 text-gray-700"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>더보기</span>
                {moreFilterCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 text-xs font-medium bg-damda-yellow text-gray-900 rounded-full">
                    {moreFilterCount}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${isMoreFilterOpen ? "rotate-180" : ""}`} />
              </button>

              {/* 더보기 필터 팝오버 */}
              {isMoreFilterOpen && (
                <div className="absolute top-full left-0 mt-2 w-[320px] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
                  {/* 가격대 */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">가격대</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PRICE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handlePriceChange(opt.value)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            currentPriceOption === opt.value
                              ? "bg-damda-yellow border-damda-yellow text-gray-900 font-medium"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 소요시간 */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">소요시간</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleDurationChange(opt.value)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            currentDurationOption === opt.value
                              ? "bg-damda-yellow border-damda-yellow text-gray-900 font-medium"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 인원수 */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">인원수</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={currentParticipants}
                        onChange={(e) => handleParticipantsChange(e.target.value)}
                        placeholder="인원 입력"
                        className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-damda-yellow focus:border-transparent"
                      />
                      <span className="text-sm text-gray-500">명 수용 가능</span>
                    </div>
                  </div>

                  {/* 평점 */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">평점</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {RATING_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleRatingChange(opt.value)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            currentMinRating === opt.value
                              ? "bg-damda-yellow border-damda-yellow text-gray-900 font-medium"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 버튼 영역 */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={clearMoreFilters}
                      className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                    >
                      초기화
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMoreFilterOpen(false)}
                      className="px-4 py-1.5 text-sm bg-damda-yellow rounded-lg hover:bg-amber-400 font-medium"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 필터 초기화 */}
            {(hasActiveFilters || hasActiveMoreFilters) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearFilters();
                  clearMoreFilters();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 mr-1" />
                필터 초기화
              </Button>
            )}
          </div>

          {/* 모바일 필터 버튼 */}
          <Button
            variant="outline"
            className="sm:hidden"
            onClick={() => setShowMobileFilter(!showMobileFilter)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            필터
            {hasActiveFilters && (
              <span className="ml-2 bg-damda-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                !
              </span>
            )}
          </Button>

          {/* 결과 수 및 정렬 */}
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <span className="text-sm text-gray-500">
              총 <span className="font-medium text-gray-900">{totalCount}</span>개
            </span>
            <Select value={currentSort} onValueChange={(v) => updateFilter("sort", v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 모바일 필터 패널 */}
        {showMobileFilter && (
          <div className="sm:hidden mt-4 pt-4 border-t border-gray-200 space-y-3">
            <Select
              value={currentCategory || "all"}
              onValueChange={(v) => updateFilter("category", v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-full h-11">
                <SelectValue placeholder="전체 카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                {mainCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 모바일 지역 검색 */}
            <div className="relative">
              <div className="flex items-center gap-2 px-4 h-11 border border-gray-200 rounded-md bg-white w-full">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={regionInput}
                  onChange={(e) => setRegionInput(e.target.value)}
                  onFocus={() => regionInput && setIsRegionOpen(filteredRegions.length > 0)}
                  placeholder="지역 검색"
                  className="flex-1 min-w-0 text-sm outline-none bg-transparent placeholder:text-gray-400"
                />
                {regionInput && (
                  <button
                    type="button"
                    onClick={clearRegion}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 모바일 지역 자동완성 드롭다운 */}
              {isRegionOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 max-h-[200px] overflow-y-auto">
                  {filteredRegions.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRegionSelect(r)}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 모바일 날짜 선택 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="flex items-center gap-2 px-4 h-11 w-full border border-gray-200 rounded-md hover:bg-gray-50 text-sm"
              >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className={dateRange?.from ? "text-gray-900" : "text-gray-500"}>
                  {getDateRangeText()}
                </span>
              </button>
            </div>

            {/* 모바일 더보기 필터 */}
            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">상세 필터</p>

              {/* 가격대 */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">가격대</p>
                <div className="flex flex-wrap gap-2">
                  {PRICE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handlePriceChange(opt.value)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        currentPriceOption === opt.value
                          ? "bg-damda-yellow border-damda-yellow text-gray-900 font-medium"
                          : "border-gray-200 text-gray-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 소요시간 */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">소요시간</p>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleDurationChange(opt.value)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        currentDurationOption === opt.value
                          ? "bg-damda-yellow border-damda-yellow text-gray-900 font-medium"
                          : "border-gray-200 text-gray-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 인원수 */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">인원수</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={currentParticipants}
                    onChange={(e) => handleParticipantsChange(e.target.value)}
                    placeholder="인원 입력"
                    className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-damda-yellow"
                  />
                  <span className="text-sm text-gray-500">명 수용 가능</span>
                </div>
              </div>

              {/* 평점 */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">평점</p>
                <div className="flex flex-wrap gap-2">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleRatingChange(opt.value)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        currentMinRating === opt.value
                          ? "bg-damda-yellow border-damda-yellow text-gray-900 font-medium"
                          : "border-gray-200 text-gray-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {(hasActiveFilters || hasActiveMoreFilters) && (
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => {
                  clearFilters();
                  clearMoreFilters();
                }}
              >
                필터 초기화
              </Button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
