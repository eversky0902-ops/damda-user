"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Calendar, Users, Search, X, ChevronDown } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import "react-day-picker/style.css";
import { getRegions, type RegionWithChildren } from "@/services/regionService";
import { useReservationSettings } from "@/hooks/use-reservation-settings";

interface ProductsSearchBarProps {
  defaultRegion?: string;
  defaultDate?: string;
  defaultParticipants?: number;
}

export function ProductsSearchBar({
  defaultRegion = "",
  defaultDate = "",
  defaultParticipants = 0,
}: ProductsSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [region, setRegion] = useState(defaultRegion || searchParams.get("region") || "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const dateParam = defaultDate || searchParams.get("date");
    return dateParam ? new Date(dateParam) : undefined;
  });
  const [participants, setParticipants] = useState(
    defaultParticipants || parseInt(searchParams.get("participants") || "0", 10)
  );

  const [activeDropdown, setActiveDropdown] = useState<"region" | "date" | "participants" | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 예약 설정 (예약 가능 기간, 최소 사전 기간)
  const { reservationAdvanceDays, minReservationNotice } = useReservationSettings();
  const minDate = addDays(new Date(), minReservationNotice);
  const maxDate = addDays(new Date(), reservationAdvanceDays);

  // 지역 데이터 조회
  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: getRegions,
    staleTime: 1000 * 60 * 60,
  });

  // 첫 번째 시/도 선택 (로딩 완료 후)
  useEffect(() => {
    if (regions.length > 0 && !selectedProvinceId) {
      setSelectedProvinceId(regions[0].id);
    }
  }, [regions, selectedProvinceId]);

  // 외부 클릭시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedProvince = regions.find((r) => r.id === selectedProvinceId);

  const handleRegionSelect = (province: RegionWithChildren, districtName?: string) => {
    if (!districtName) {
      setRegion(province.name);
    } else {
      setRegion(`${province.name} ${districtName}`);
    }
    setActiveDropdown(null);
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (region) {
      params.set("region", region);
    } else {
      params.delete("region");
    }

    if (selectedDate) {
      params.set("date", format(selectedDate, "yyyy-MM-dd"));
    } else {
      params.delete("date");
    }

    if (participants > 0) {
      params.set("participants", participants.toString());
    } else {
      params.delete("participants");
    }

    params.set("page", "1");
    setActiveDropdown(null);
    router.push(`/products?${params.toString()}`);
  };

  const getDateText = () => {
    if (!selectedDate) return "날짜 선택";
    return format(selectedDate, "M월 d일 (E)", { locale: ko });
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative" ref={containerRef}>
      <div className="flex items-center bg-white rounded-full shadow-lg overflow-hidden">
        {/* 지역 */}
        <div
          className="flex-1 flex items-center gap-2 px-4 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setActiveDropdown(activeDropdown === "region" ? null : "region")}
        >
          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
          <span className={`text-sm ${region ? "text-gray-900" : "text-gray-400"}`}>
            {region || "지역"}
          </span>
        </div>

        {/* 날짜 */}
        <div
          className="flex-1 flex items-center gap-2 px-4 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setActiveDropdown(activeDropdown === "date" ? null : "date")}
        >
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span className={`text-sm ${selectedDate ? "text-gray-900" : "text-gray-400"}`}>
            {getDateText()}
          </span>
        </div>

        {/* 인원 */}
        <div
          className="flex-1 flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setActiveDropdown(activeDropdown === "participants" ? null : "participants")}
        >
          <Users className="w-4 h-4 text-gray-400 shrink-0" />
          <span className={`text-sm ${participants > 0 ? "text-gray-900" : "text-gray-400"}`}>
            {participants > 0 ? `${participants}명` : "인원"}
          </span>
        </div>

        {/* 검색 버튼 */}
        <button
          type="button"
          onClick={handleSearch}
          className="m-1.5 px-6 py-2.5 bg-damda-yellow rounded-full flex items-center justify-center hover:bg-damda-yellow-dark transition-colors text-sm font-medium text-gray-900"
        >
          검색
        </button>
      </div>

      {/* 지역 드롭다운 */}
      {activeDropdown === "region" && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="flex max-h-[320px]">
            {/* 시/도 목록 */}
            <div className="w-1/3 border-r border-gray-100 overflow-y-auto bg-gray-50">
              {regions.map((province) => (
                <button
                  key={province.id}
                  type="button"
                  onClick={() => setSelectedProvinceId(province.id)}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                    selectedProvinceId === province.id
                      ? "bg-white text-damda-yellow-dark font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {province.name}
                </button>
              ))}
            </div>

            {/* 구/군 목록 */}
            <div className="flex-1 overflow-y-auto p-2">
              {selectedProvince && (
                <div className="grid grid-cols-2 gap-1">
                  {/* 전체 선택 */}
                  <button
                    type="button"
                    onClick={() => handleRegionSelect(selectedProvince)}
                    className="px-3 py-2 text-left text-sm text-gray-700 hover:bg-damda-yellow-light rounded-lg transition-colors"
                  >
                    전체
                  </button>
                  {selectedProvince.children?.map((district) => (
                    <button
                      key={district.id}
                      type="button"
                      onClick={() => handleRegionSelect(selectedProvince, district.name)}
                      className="px-3 py-2 text-left text-sm text-gray-700 hover:bg-damda-yellow-light rounded-lg transition-colors"
                    >
                      {district.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 날짜 드롭다운 */}
      {activeDropdown === "date" && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
          <style>{`
            .hero-calendar .rdp-root {
              --rdp-accent-color: #F8B737;
              --rdp-accent-background-color: #FEF3C7;
              --rdp-day-height: 40px;
              --rdp-day-width: 40px;
              font-size: 14px;
            }
            .hero-calendar .rdp-day_button {
              font-size: 14px;
            }
            .hero-calendar .rdp-caption_label {
              font-size: 15px;
              font-weight: 600;
            }
            .hero-calendar .rdp-weekday {
              font-size: 12px;
              color: #6b7280;
            }
            .hero-calendar .rdp-selected .rdp-day_button {
              background-color: #F8B737;
              color: #1f2937;
            }
          `}</style>
          <div className="hero-calendar">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setActiveDropdown(null);
              }}
              locale={ko}
              disabled={{ before: minDate, after: maxDate }}
            />
          </div>
        </div>
      )}

      {/* 인원 드롭다운 */}
      {activeDropdown === "participants" && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
          <p className="text-sm font-medium text-gray-700 mb-3">참여 인원</p>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setParticipants(Math.max(0, participants - 1))}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30"
              disabled={participants <= 0}
            >
              -
            </button>
            <span className="text-lg font-medium text-gray-900">{participants}명</span>
            <button
              type="button"
              onClick={() => setParticipants(participants + 1)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => setActiveDropdown(null)}
            className="w-full mt-4 py-2 bg-damda-yellow rounded-lg text-sm font-medium text-gray-900 hover:bg-damda-yellow-dark transition-colors"
          >
            적용
          </button>
        </div>
      )}
    </div>
  );
}
