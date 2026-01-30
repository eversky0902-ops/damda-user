"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Calendar, ChevronRight, Loader2, X, ChevronLeft } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import "react-day-picker/style.css";
import { getRegions, getPopularRegions, type RegionWithChildren } from "@/services/regionService";

export function SearchBar() {
  const router = useRouter();
  const [region, setRegion] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileTab, setMobileTab] = useState<"region" | "date">("region");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Portal을 위한 mounted 상태
  useEffect(() => {
    setMounted(true);
  }, []);

  // 지역 데이터 조회
  const { data: regions = [], isLoading: isLoadingRegions } = useQuery({
    queryKey: ["regions"],
    queryFn: getRegions,
    staleTime: 1000 * 60 * 60,
  });

  // 인기 지역 조회
  const { data: popularRegions = [] } = useQuery({
    queryKey: ["popularRegions"],
    queryFn: getPopularRegions,
    staleTime: 1000 * 60 * 60,
  });

  // 첫 번째 시/도 선택 (로딩 완료 후)
  useEffect(() => {
    if (regions.length > 0 && !selectedProvinceId) {
      setSelectedProvinceId(regions[0].id);
    }
  }, [regions, selectedProvinceId]);

  // 외부 클릭시 닫기 (데스크탑만)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (window.innerWidth >= 768) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 모바일에서 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const selectedProvince = regions.find((r) => r.id === selectedProvinceId);

  const handleRegionSelect = (province: RegionWithChildren, districtName?: string) => {
    if (!districtName) {
      setRegion(province.name);
    } else {
      setRegion(`${province.name} ${districtName}`);
    }
    // 모바일에서 지역 선택 후 날짜 탭으로 자동 이동
    if (window.innerWidth < 768) {
      setMobileTab("date");
    }
  };

  const handlePopularClick = (provinceId: string) => {
    setSelectedProvinceId(provinceId);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (selectedDate) params.set("date", format(selectedDate, "yyyy-MM-dd"));

    setIsOpen(false);
    router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const getDateText = () => {
    if (!selectedDate) return "날짜 선택";
    return format(selectedDate, "M월 d일 (E)", { locale: ko });
  };

  const getRegionText = () => {
    return region || "지역 선택";
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative" ref={dropdownRef}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center bg-white/95 rounded-full shadow-lg">
          {/* 지역 */}
          <div
            className="flex-1 flex items-center gap-2 px-5 py-3 border-r border-gray-200 cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <MapPin className="w-5 h-5 text-damda-yellow-dark shrink-0" />
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-xs text-gray-500 font-medium">지역</span>
              <span className={`text-sm ${region ? "text-gray-700" : "text-gray-400"}`}>
                {getRegionText()}
              </span>
            </div>
          </div>

          {/* 일정 */}
          <div
            className="flex-1 flex items-center gap-2 px-5 py-3 cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Calendar className="w-5 h-5 text-damda-yellow-dark shrink-0" />
            <div className="flex flex-col items-start min-w-0">
              <span className="text-xs text-gray-500 font-medium">일정</span>
              <span className={`text-sm ${selectedDate ? "text-gray-700" : "text-gray-400"}`}>
                {getDateText()}
              </span>
            </div>
          </div>

          {/* 검색 버튼 */}
          <button
            type="submit"
            className="m-2 w-12 h-12 bg-damda-yellow rounded-full flex items-center justify-center hover:bg-damda-yellow-dark transition-colors shrink-0"
          >
            <Search className="w-5 h-5 text-gray-800" />
          </button>
        </div>

        {/* 모바일: 전체화면 모달 (Portal) / 데스크탑: 드롭다운 */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* 모바일 전체화면 모달 - Portal로 body에 직접 렌더링 */}
              {mounted && createPortal(
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="fixed inset-0 z-[100] bg-white flex flex-col md:hidden"
                    >
                      {/* 헤더 */}
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="flex items-center px-4 py-3 border-b border-gray-100"
                      >
                        <button
                          type="button"
                          onClick={() => setIsOpen(false)}
                          className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h2 className="flex-1 text-center text-lg font-semibold pr-8">검색</h2>
                      </motion.div>

                      {/* 탭 */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                        className="flex border-b border-gray-200"
                      >
                        <button
                          type="button"
                          onClick={() => setMobileTab("region")}
                          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                            mobileTab === "region"
                              ? "text-damda-yellow-dark"
                              : "text-gray-500"
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                          지역
                          {region && (
                            <span className="ml-1 px-2 py-0.5 bg-damda-yellow/20 rounded-full text-xs">
                              {region.length > 8 ? region.substring(0, 8) + "..." : region}
                            </span>
                          )}
                          {mobileTab === "region" && (
                            <motion.div
                              layoutId="mobileTabIndicator"
                              className="absolute bottom-0 left-0 right-0 h-0.5 bg-damda-yellow-dark"
                            />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMobileTab("date")}
                          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                            mobileTab === "date"
                              ? "text-damda-yellow-dark"
                              : "text-gray-500"
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          날짜
                          {selectedDate && (
                            <span className="ml-1 px-2 py-0.5 bg-damda-yellow/20 rounded-full text-xs">
                              {format(selectedDate, "M/d")}
                            </span>
                          )}
                          {mobileTab === "date" && (
                            <motion.div
                              layoutId="mobileTabIndicator"
                              className="absolute bottom-0 left-0 right-0 h-0.5 bg-damda-yellow-dark"
                            />
                          )}
                        </button>
                      </motion.div>

                      {/* 컨텐츠 - 스크롤 영역 */}
                      <div className="flex-1 overflow-auto">
                        <AnimatePresence mode="wait">
                          {mobileTab === "region" ? (
                            <motion.div
                              key="region"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}
                            >
                              {/* 인기 지역 */}
                              <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-xs text-gray-500 mb-2">인기 지역</p>
                                <div className="flex gap-2 flex-wrap">
                                  {popularRegions.map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => handlePopularClick(p.id)}
                                      className={`px-4 py-2 text-sm rounded-full border transition-all ${
                                        selectedProvinceId === p.id
                                          ? "bg-damda-yellow border-damda-yellow text-gray-800 font-medium shadow-sm"
                                          : "border-gray-200 text-gray-600 hover:border-damda-yellow hover:bg-damda-yellow-light/30"
                                      }`}
                                    >
                                      {p.name}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 시/도 + 구/군 */}
                              <div className="flex" style={{ height: "calc(100vh - 280px)" }}>
                                <div className="w-[100px] border-r border-gray-100 overflow-y-auto bg-gray-50">
                                  {isLoadingRegions ? (
                                    <div className="flex items-center justify-center py-8">
                                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                    </div>
                                  ) : (
                                    regions.map((province) => (
                                      <button
                                        key={province.id}
                                        type="button"
                                        onClick={() => setSelectedProvinceId(province.id)}
                                        className={`w-full px-3 py-3 text-left text-sm flex items-center justify-between transition-colors ${
                                          selectedProvinceId === province.id
                                            ? "bg-white text-damda-yellow-dark font-semibold"
                                            : "text-gray-600"
                                        }`}
                                      >
                                        {province.name}
                                        {selectedProvinceId === province.id && (
                                          <ChevronRight className="w-4 h-4" />
                                        )}
                                      </button>
                                    ))
                                  )}
                                </div>

                                <div className="flex-1 overflow-y-auto p-3">
                                  <div className="grid grid-cols-3 gap-2">
                                    {selectedProvince && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleRegionSelect(selectedProvince)}
                                          className={`px-2 py-2.5 text-center text-sm rounded-xl transition-all ${
                                            region === selectedProvince.name
                                              ? "bg-damda-yellow text-gray-800 font-semibold shadow-sm"
                                              : "text-gray-700 hover:bg-gray-100"
                                          }`}
                                        >
                                          전체
                                        </button>
                                        {selectedProvince.children.map((district) => (
                                          <button
                                            key={district.id}
                                            type="button"
                                            onClick={() => handleRegionSelect(selectedProvince, district.name)}
                                            className={`px-2 py-2.5 text-center text-sm rounded-xl transition-all truncate ${
                                              region === `${selectedProvince.name} ${district.name}`
                                                ? "bg-damda-yellow text-gray-800 font-semibold shadow-sm"
                                                : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                          >
                                            {district.name}
                                          </button>
                                        ))}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="date"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.2 }}
                              className="p-4"
                            >
                              <style>{`
                                .calendar-mobile-full {
                                  width: 100%;
                                }
                                .calendar-mobile-full .rdp-root {
                                  --rdp-accent-color: #F8B737;
                                  --rdp-accent-background-color: #FEF3C7;
                                  font-size: 15px;
                                  width: 100%;
                                }
                                .calendar-mobile-full .rdp-month {
                                  width: 100%;
                                }
                                .calendar-mobile-full .rdp-month_grid {
                                  width: 100%;
                                }
                                .calendar-mobile-full .rdp-weekdays,
                                .calendar-mobile-full .rdp-week {
                                  display: flex;
                                  justify-content: space-between;
                                }
                                .calendar-mobile-full .rdp-weekday,
                                .calendar-mobile-full .rdp-day {
                                  flex: 1;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  aspect-ratio: 1;
                                }
                                .calendar-mobile-full .rdp-day_button {
                                  width: 100%;
                                  height: 100%;
                                  max-width: 48px;
                                  max-height: 48px;
                                  font-size: 16px;
                                  border-radius: 12px;
                                }
                                .calendar-mobile-full .rdp-caption_label {
                                  font-size: 18px;
                                  font-weight: 600;
                                }
                                .calendar-mobile-full .rdp-weekday {
                                  font-size: 14px;
                                  color: #6b7280;
                                  font-weight: 500;
                                }
                                .calendar-mobile-full .rdp-selected .rdp-day_button {
                                  background-color: #F8B737;
                                  color: #1f2937;
                                  font-weight: 600;
                                }
                                .calendar-mobile-full .rdp-today:not(.rdp-selected) .rdp-day_button {
                                  border: 2px solid #F8B737;
                                }
                                .calendar-mobile-full .rdp-nav {
                                  gap: 8px;
                                }
                              `}</style>
                              <div className="calendar-mobile-full">
                                <DayPicker
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={setSelectedDate}
                                  locale={ko}
                                  numberOfMonths={1}
                                  disabled={{ before: new Date() }}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* 하단 버튼 - 고정 */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="flex gap-3 px-4 py-4 border-t border-gray-100 bg-white"
                        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setRegion("");
                            setSelectedDate(undefined);
                          }}
                          className="px-6 py-3 text-sm text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                        >
                          초기화
                        </button>
                        <button
                          type="button"
                          onClick={handleSearch}
                          className="flex-1 py-3 text-sm bg-damda-yellow rounded-full hover:bg-damda-yellow-dark transition-colors font-semibold flex items-center justify-center gap-2"
                        >
                          <Search className="w-4 h-4" />
                          검색하기
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>,
                document.body
              )}

              {/* 데스크탑 드롭다운 */}
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="
                  hidden md:block
                  absolute top-full left-1/2 -translate-x-1/2 mt-2
                  bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50
                "
              >
                <div className="flex">
                  {/* 좌측: 지역 선택 */}
                  <div className="w-[340px] border-r border-gray-100">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <MapPin className="w-4 h-4 text-damda-yellow-dark" />
                        지역 선택
                        {region && (
                          <span className="ml-auto px-2 py-0.5 bg-damda-yellow/20 rounded-full text-xs text-damda-yellow-dark">
                            {region}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex gap-2 flex-wrap">
                        {popularRegions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handlePopularClick(p.id)}
                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                              selectedProvinceId === p.id
                                ? "bg-damda-yellow border-damda-yellow text-gray-800"
                                : "border-gray-200 text-gray-600 hover:border-damda-yellow"
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex h-[280px]">
                      <div className="w-[100px] border-r border-gray-100 overflow-y-auto bg-gray-50">
                        {isLoadingRegions ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          regions.map((province) => (
                            <button
                              key={province.id}
                              type="button"
                              onClick={() => setSelectedProvinceId(province.id)}
                              className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                                selectedProvinceId === province.id
                                  ? "bg-white text-damda-yellow-dark font-medium"
                                  : "text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              {province.name}
                              {selectedProvinceId === province.id && (
                                <ChevronRight className="w-3 h-3" />
                              )}
                            </button>
                          ))
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto p-2">
                        <div className="grid grid-cols-2 gap-1">
                          {selectedProvince && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRegionSelect(selectedProvince)}
                                className={`px-2 py-1.5 text-left text-sm rounded-lg transition-colors ${
                                  region === selectedProvince.name
                                    ? "bg-damda-yellow text-gray-800 font-medium"
                                    : "text-gray-700 hover:bg-damda-yellow-light/50"
                                }`}
                              >
                                전체
                              </button>
                              {selectedProvince.children.map((district) => (
                                <button
                                  key={district.id}
                                  type="button"
                                  onClick={() => handleRegionSelect(selectedProvince, district.name)}
                                  className={`px-2 py-1.5 text-left text-sm rounded-lg transition-colors truncate ${
                                    region === `${selectedProvince.name} ${district.name}`
                                      ? "bg-damda-yellow text-gray-800 font-medium"
                                      : "text-gray-700 hover:bg-damda-yellow-light/50"
                                  }`}
                                >
                                  {district.name}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 우측: 날짜 선택 */}
                  <div className="w-[340px]">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Calendar className="w-4 h-4 text-damda-yellow-dark" />
                        날짜 선택
                        {selectedDate && (
                          <span className="ml-auto px-2 py-0.5 bg-damda-yellow/20 rounded-full text-xs text-damda-yellow-dark">
                            {format(selectedDate, "M월 d일")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 flex justify-center">
                      <style>{`
                        .calendar-compact .rdp-root {
                          --rdp-accent-color: #F8B737;
                          --rdp-accent-background-color: #FEF3C7;
                          --rdp-day-height: 36px;
                          --rdp-day-width: 36px;
                          font-size: 13px;
                        }
                        .calendar-compact .rdp-day_button {
                          font-size: 13px;
                        }
                        .calendar-compact .rdp-caption_label {
                          font-size: 14px;
                          font-weight: 600;
                        }
                        .calendar-compact .rdp-weekday {
                          font-size: 11px;
                          color: #6b7280;
                        }
                        .calendar-compact .rdp-selected .rdp-day_button {
                          background-color: #F8B737;
                          color: #1f2937;
                        }
                        .calendar-compact .rdp-nav {
                          gap: 0;
                        }
                      `}</style>
                      <div className="calendar-compact">
                        <DayPicker
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          locale={ko}
                          numberOfMonths={1}
                          disabled={{ before: new Date() }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 하단 버튼 */}
                <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => {
                      setRegion("");
                      setSelectedDate(undefined);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    초기화
                  </button>
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="px-6 py-2 text-sm bg-damda-yellow rounded-full hover:bg-damda-yellow-dark transition-colors font-medium flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    검색하기
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
