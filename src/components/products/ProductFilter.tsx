"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Calendar, MapPin } from "lucide-react";
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

// 지역 목록
const REGIONS = [
  "서울특별시",
  "서울 강남구",
  "서울 강동구",
  "서울 강북구",
  "서울 강서구",
  "서울 관악구",
  "서울 광진구",
  "서울 구로구",
  "서울 금천구",
  "서울 노원구",
  "서울 도봉구",
  "서울 동대문구",
  "서울 동작구",
  "서울 마포구",
  "서울 서대문구",
  "서울 서초구",
  "서울 성동구",
  "서울 성북구",
  "서울 송파구",
  "서울 양천구",
  "서울 영등포구",
  "서울 용산구",
  "서울 은평구",
  "서울 종로구",
  "서울 중구",
  "서울 중랑구",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "경기 수원시",
  "경기 성남시",
  "경기 고양시",
  "경기 용인시",
  "경기 부천시",
  "경기 안산시",
  "경기 안양시",
  "경기 남양주시",
  "경기 화성시",
  "경기 평택시",
  "경기 의정부시",
  "경기 시흥시",
  "경기 파주시",
  "경기 김포시",
  "경기 광명시",
  "경기 광주시",
  "경기 군포시",
  "경기 하남시",
  "경기 오산시",
  "경기 이천시",
  "경기 안성시",
  "경기 의왕시",
  "경기 양평군",
  "강원도",
  "강원 춘천시",
  "강원 원주시",
  "강원 강릉시",
  "강원 속초시",
  "충청북도",
  "충청남도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

interface ProductFilterProps {
  categories: Category[];
  totalCount: number;
}

const SORT_OPTIONS = [
  { value: "newest", label: "최신순" },
  { value: "price_low", label: "가격 낮은순" },
  { value: "price_high", label: "가격 높은순" },
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
  const [regionInput, setRegionInput] = useState(searchParams.get("region") || "");
  const [filteredRegions, setFilteredRegions] = useState<string[]>([]);
  const calendarRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);

  const currentCategory = searchParams.get("category") || "";
  const currentRegion = searchParams.get("region") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 지역 검색 필터링
  useEffect(() => {
    if (regionInput.trim()) {
      const filtered = REGIONS.filter((r) =>
        r.toLowerCase().includes(regionInput.toLowerCase())
      );
      setFilteredRegions(filtered);
      setIsRegionOpen(filtered.length > 0);
    } else {
      setFilteredRegions([]);
      setIsRegionOpen(false);
    }
  }, [regionInput]);

  const handleRegionSelect = (selectedRegion: string) => {
    setRegionInput(selectedRegion);
    setIsRegionOpen(false);
    updateFilter("region", selectedRegion);
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

  const hasActiveFilters = currentCategory || currentRegion || fromDate;

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

            {/* 필터 초기화 */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
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

            {hasActiveFilters && (
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={clearFilters}
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
