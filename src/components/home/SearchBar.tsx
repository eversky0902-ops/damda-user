"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, Calendar, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, addDays, startOfMonth, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import "react-day-picker/style.css";
import { REGION_GROUPS, type RegionGroup } from "@/constants/regionGroups";
import { useReservationSettings } from "@/hooks/use-reservation-settings";

const provinces = Object.keys(REGION_GROUPS);

type SelectedGroup = {
  type: 'province' | 'group';
  province: string;
  label: string;
  regionKeys: string[];
};

const findGroupFromRegions = (regions: string[]): SelectedGroup | null => {
  if (regions.length === 0) return null;
  const province = provinces.find(p => regions.length === 1 && regions[0] === p);
  if (province) return { type: 'province', province, label: '전체', regionKeys: [province] };
  for (const [prov, groups] of Object.entries(REGION_GROUPS)) {
    for (const group of groups) {
      const keys = group.districts.map(d => `${prov} ${d}`);
      if (keys.length === regions.length && keys.every(k => regions.includes(k)) && regions.every(k => keys.includes(k))) {
        return { type: 'group', province: prov, label: group.label, regionKeys: keys };
      }
    }
  }
  const firstProvince = regions[0]?.split(' ')[0] || provinces[0];
  return { type: 'group', province: firstProvince, label: regions.join(', '), regionKeys: regions };
};

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터에서 초기값 읽기 (콤마로 구분된 다중 지역 지원)
  const initialRegions = searchParams.get("region")?.split(",").filter(Boolean) || [];
  const initialDateStr = searchParams.get("date") || "";
  const initialDate = initialDateStr
    ? (() => {
        try {
          return parse(initialDateStr, "yyyy-MM-dd", new Date());
        } catch {
          return undefined;
        }
      })()
    : undefined;

  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(findGroupFromRegions(initialRegions));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>(provinces[0] || "서울");
  const [mounted, setMounted] = useState(false);
  const [mobileTab, setMobileTab] = useState<"region" | "date">("region");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [initialScrollY, setInitialScrollY] = useState(0);

  // URL 파라미터 변경 시 상태 업데이트
  useEffect(() => {
    setSelectedGroup(findGroupFromRegions(initialRegions));
    setSelectedDate(initialDate);
  }, [searchParams.get("region"), initialDateStr]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);

  // 예약 설정 (예약 가능 기간, 최소 사전 기간)
  const { reservationAdvanceDays, minReservationNotice } = useReservationSettings();
  const minDate = addDays(new Date(), minReservationNotice);
  const maxDate = addDays(new Date(), reservationAdvanceDays);

  // Portal을 위한 mounted 상태
  useEffect(() => {
    setMounted(true);
  }, []);

  // 드롭다운 위치 계산
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const dropdownWidth = 760; // 드롭다운 너비 (420px + 340px)
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left + (rect.width - dropdownWidth) / 2,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // 현재 선택된 시/도의 그룹 목록
  const currentGroups = REGION_GROUPS[selectedProvince] || [];

  // 드롭다운이 열릴 때 현재 스크롤 위치 저장
  useEffect(() => {
    if (isOpen) {
      setInitialScrollY(window.scrollY);
    }
  }, [isOpen]);

  // 스크롤 시 드롭다운 닫기 (데스크탑, 일정 거리 이상 스크롤 시)
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      // 데스크탑에서만 스크롤로 닫기
      if (window.innerWidth >= 768) {
        const scrollDiff = Math.abs(window.scrollY - initialScrollY);
        // 100px 이상 스크롤하면 닫기
        if (scrollDiff > 100) {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isOpen, initialScrollY]);

  // 외부 클릭시 닫기 (데스크탑만)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = dropdownRef.current?.contains(target);
      const isInsideDropdown = desktopDropdownRef.current?.contains(target);

      if (!isInsideTrigger && !isInsideDropdown) {
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

  // 시/도 "전체" 선택/해제 (단일 선택)
  const handleProvinceSelect = (province: string) => {
    setSelectedGroup(prev =>
      prev?.type === 'province' && prev?.province === province
        ? null
        : { type: 'province', province, label: '전체', regionKeys: [province] }
    );
  };

  // 그룹 선택/해제 (단일 선택 - 그룹 identity 기반)
  const handleGroupSelect = (province: string, group: RegionGroup) => {
    const regionKeys = group.districts.map(d => `${province} ${d}`);
    setSelectedGroup(prev =>
      prev?.type === 'group' && prev?.province === province && prev?.label === group.label
        ? null
        : { type: 'group', province, label: group.label, regionKeys }
    );
  };

  // 시/도 "전체" 선택 여부
  const isProvinceSelected = (province: string) => {
    return selectedGroup?.type === 'province' && selectedGroup?.province === province;
  };

  // 그룹 선택 여부 (label 기반으로 고유 식별)
  const isGroupSelected = (province: string, group: RegionGroup) => {
    return selectedGroup?.type === 'group' && selectedGroup?.province === province && selectedGroup?.label === group.label;
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedGroup) params.set("region", selectedGroup.regionKeys.join(","));
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
    if (!selectedGroup) return "지역 선택";
    if (selectedGroup.type === 'province') return `${selectedGroup.province} 전체`;
    return `${selectedGroup.province} ${selectedGroup.label}`;
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
              <span className={`text-sm ${selectedGroup ? "text-gray-700" : "text-gray-400"}`}>
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
                              {/* 시/도 + 동네 그룹 */}
                              <div className="flex" style={{ height: "calc(100vh - 200px)" }}>
                                <div className="w-[100px] border-r border-gray-100 overflow-y-auto bg-gray-50">
                                  {provinces.map((province) => (
                                    <button
                                      key={province}
                                      type="button"
                                      onClick={() => setSelectedProvince(province)}
                                      className={`w-full px-3 py-3 text-left text-sm flex items-center justify-between transition-colors ${
                                        selectedProvince === province
                                          ? "bg-white text-damda-yellow-dark font-semibold"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      {province}
                                      {selectedProvince === province && (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </button>
                                  ))}
                                </div>

                                <div className="flex-1 overflow-y-auto p-3">
                                  <div className="flex flex-col gap-1">
                                    {/* 전체 버튼 */}
                                    <button
                                      type="button"
                                      onClick={() => handleProvinceSelect(selectedProvince)}
                                      className={`px-3 py-2.5 text-left text-sm rounded-xl transition-all flex items-center gap-2 ${
                                        isProvinceSelected(selectedProvince)
                                          ? "bg-damda-yellow text-gray-800 font-semibold shadow-sm"
                                          : "text-gray-700 hover:bg-gray-100"
                                      }`}
                                    >
                                      {isProvinceSelected(selectedProvince) && <Check className="w-3.5 h-3.5 shrink-0" />}
                                      전체
                                    </button>
                                    {/* 동네 그룹 목록 */}
                                    {currentGroups.map((group) => (
                                      <button
                                        key={group.label}
                                        type="button"
                                        onClick={() => handleGroupSelect(selectedProvince, group)}
                                        className={`px-3 py-2.5 text-left text-sm rounded-xl transition-all flex items-center gap-2 ${
                                          isGroupSelected(selectedProvince, group)
                                            ? "bg-damda-yellow text-gray-800 font-semibold shadow-sm"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                      >
                                        {isGroupSelected(selectedProvince, group) && <Check className="w-3.5 h-3.5 shrink-0" />}
                                        <span className="leading-snug">{group.label}</span>
                                      </button>
                                    ))}
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
                                  disabled={{ before: minDate, after: maxDate }}
                                  startMonth={startOfMonth(new Date())}
                                  endMonth={startOfMonth(maxDate)}
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
                            setSelectedGroup(null);
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

              {/* 데스크탑 드롭다운 - Portal로 body에 렌더링 */}
              {mounted && createPortal(
                <motion.div
                  ref={desktopDropdownRef}
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{
                    position: 'fixed',
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                  }}
                  className="
                    hidden md:block
                    bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[100]
                  "
              >
                <div className="flex">
                  {/* 좌측: 지역 선택 */}
                  <div className="w-[420px] border-r border-gray-100">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <MapPin className="w-4 h-4 text-damda-yellow-dark" />
                        지역 선택
                        {selectedGroup && (
                          <span className="ml-auto px-2 py-0.5 bg-damda-yellow/20 rounded-full text-xs text-damda-yellow-dark">
                            {getRegionText()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex h-[320px]">
                      <div className="w-[110px] border-r border-gray-100 overflow-y-auto bg-gray-50">
                        {provinces.map((province) => (
                          <button
                            key={province}
                            type="button"
                            onClick={() => setSelectedProvince(province)}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                              selectedProvince === province
                                ? "bg-white text-damda-yellow-dark font-medium"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {province}
                            {selectedProvince === province && (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="flex-1 overflow-y-auto p-2">
                        <div className="flex flex-col gap-0.5">
                          {/* 전체 버튼 */}
                          <button
                            type="button"
                            onClick={() => handleProvinceSelect(selectedProvince)}
                            className={`px-3 py-1.5 text-left text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                              isProvinceSelected(selectedProvince)
                                ? "bg-damda-yellow text-gray-800 font-medium"
                                : "text-gray-700 hover:bg-damda-yellow-light/50"
                            }`}
                          >
                            {isProvinceSelected(selectedProvince) && <Check className="w-3 h-3 shrink-0" />}
                            전체
                          </button>
                          {/* 동네 그룹 목록 */}
                          {currentGroups.map((group) => (
                            <button
                              key={group.label}
                              type="button"
                              onClick={() => handleGroupSelect(selectedProvince, group)}
                              className={`px-3 py-1.5 text-left text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                                isGroupSelected(selectedProvince, group)
                                  ? "bg-damda-yellow text-gray-800 font-medium"
                                  : "text-gray-700 hover:bg-damda-yellow-light/50"
                              }`}
                            >
                              {isGroupSelected(selectedProvince, group) && <Check className="w-3 h-3 shrink-0" />}
                              <span className="leading-snug">{group.label}</span>
                            </button>
                          ))}
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
                          disabled={{ before: minDate, after: maxDate }}
                          startMonth={startOfMonth(new Date())}
                          endMonth={startOfMonth(maxDate)}
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
                      setSelectedGroup(null);
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
              </motion.div>,
              document.body
              )}
            </>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
