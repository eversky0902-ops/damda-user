"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Calendar } from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import "react-day-picker/style.css";

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

export function SearchBar() {
  const router = useRouter();
  const [region, setRegion] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [filteredRegions, setFilteredRegions] = useState<string[]>([]);

  const calendarRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);

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
    if (region.trim()) {
      const filtered = REGIONS.filter((r) =>
        r.toLowerCase().includes(region.toLowerCase())
      );
      setFilteredRegions(filtered);
      setIsRegionOpen(filtered.length > 0);
    } else {
      setFilteredRegions([]);
      setIsRegionOpen(false);
    }
  }, [region]);

  const handleRegionSelect = (selectedRegion: string) => {
    setRegion(selectedRegion);
    setIsRegionOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (dateRange?.from) params.set("from", format(dateRange.from, "yyyy-MM-dd"));
    if (dateRange?.to) params.set("to", format(dateRange.to, "yyyy-MM-dd"));

    router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const getDateRangeText = () => {
    if (!dateRange?.from) return "";
    if (!dateRange.to) return format(dateRange.from, "M월 d일", { locale: ko });
    return `${format(dateRange.from, "M월 d일", { locale: ko })} - ${format(dateRange.to, "M월 d일", { locale: ko })}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center bg-white/95 rounded-full shadow-lg">
          {/* 지역 */}
          <div className="flex-1 relative" ref={regionRef}>
            <div className="flex items-center gap-2 px-5 py-3 border-r border-gray-200">
              <MapPin className="w-5 h-5 text-damda-yellow-dark shrink-0" />
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-xs text-gray-500 font-medium">지역</span>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  onFocus={() => region && setIsRegionOpen(filteredRegions.length > 0)}
                  placeholder="어디로 갈까요?"
                  className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            {/* 지역 자동완성 드롭다운 */}
            {isRegionOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 max-h-[240px] overflow-y-auto">
                {filteredRegions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRegionSelect(r)}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-damda-yellow-light/50 flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 일정 */}
          <div className="flex-1 relative" ref={calendarRef}>
            <div
              className="flex items-center gap-2 px-5 py-3 cursor-pointer"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            >
              <Calendar className="w-5 h-5 text-damda-yellow-dark shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-xs text-gray-500 font-medium">일정</span>
                <span className={`text-sm ${dateRange?.from ? "text-gray-700" : "text-gray-400"}`}>
                  {getDateRangeText() || "언제 갈까요?"}
                </span>
              </div>
            </div>

            {/* 캘린더 팝오버 */}
            {isCalendarOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                <style>{`
                  .calendar-wrapper .rdp-root {
                    --rdp-accent-color: #F8B737;
                    --rdp-accent-background-color: #FEF3C7;
                    --rdp-day-height: 36px;
                    --rdp-day-width: 36px;
                    --rdp-months-gap: 24px;
                    font-size: 14px;
                  }
                  .calendar-wrapper .rdp-months {
                    display: flex !important;
                    flex-wrap: nowrap !important;
                  }
                  .calendar-wrapper .rdp-day_button {
                    font-size: 14px;
                  }
                  .calendar-wrapper .rdp-caption_label {
                    font-size: 15px;
                    font-weight: 600;
                  }
                  .calendar-wrapper .rdp-weekday {
                    font-size: 12px;
                    color: #6b7280;
                  }
                  .calendar-wrapper .rdp-selected .rdp-day_button {
                    background-color: #F8B737;
                    color: #1f2937;
                  }
                  .calendar-wrapper .rdp-range_middle .rdp-day_button {
                    background-color: #FEF3C7;
                    color: #1f2937;
                  }
                `}</style>
                <div className="calendar-wrapper">
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
                    onClick={() => setDateRange(undefined)}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    초기화
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(false)}
                    className="px-3 py-1.5 text-sm bg-damda-yellow rounded-lg hover:bg-damda-yellow-dark"
                  >
                    확인
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 검색 버튼 */}
          <button
            type="submit"
            className="m-2 w-12 h-12 bg-damda-yellow rounded-full flex items-center justify-center hover:bg-damda-yellow-dark transition-colors shrink-0"
          >
            <Search className="w-5 h-5 text-gray-800" />
          </button>
        </div>
      </form>
    </div>
  );
}
