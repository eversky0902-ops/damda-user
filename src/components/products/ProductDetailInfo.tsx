"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Users,
  Clock,
  Building2,
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { format, addDays, isBefore, isAfter, startOfDay, getDay, parse } from "date-fns";
import { ko } from "date-fns/locale";
import type { ProductDetail } from "@/services/productService";
import { addRecentView } from "@/services/recentViewService";
import { getUnavailableDates } from "@/services/holdService";

interface ProductDetailInfoProps {
  product: ProductDetail;
}

export function ProductDetailInfo({ product }: ProductDetailInfoProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem, setDirectItem } = useCart();

  // URL 파라미터에서 날짜 읽기
  const initialDate = useMemo(() => {
    const dateParam = searchParams.get("date");
    if (!dateParam) return undefined;
    try {
      const parsed = parse(dateParam, "yyyy-MM-dd", new Date());
      // 유효한 날짜이고, 오늘 이후인 경우에만 사용
      if (!isNaN(parsed.getTime()) && !isBefore(parsed, startOfDay(new Date()))) {
        return parsed;
      }
    } catch {
      // 파싱 실패 시 무시
    }
    return undefined;
  }, [searchParams]);

  // 최근 본 상품에 추가 (DB 저장)
  useEffect(() => {
    addRecentView(product.id);
  }, [product.id]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Map<string, number>>(new Map());
  const [participants, setParticipants] = useState(product.min_participants);
  const [participantsInput, setParticipantsInput] = useState(String(product.min_participants));
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reservedDates, setReservedDates] = useState<Set<string>>(new Set());

  // 예약된 날짜 목록 조회 (1일 1예약 체크용)
  useEffect(() => {
    const fetchReservedDates = async () => {
      try {
        const dates = await getUnavailableDates(product.id);
        const dateSet = new Set(dates);
        setReservedDates(dateSet);

        // URL 파라미터로 설정된 날짜가 예약 불가능한 경우 초기화
        if (selectedDate) {
          const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
          if (dateSet.has(selectedDateStr)) {
            setSelectedDate(undefined);
            setSelectedTime(undefined);
          }
        }
      } catch (error) {
        console.error("Error fetching reserved dates:", error);
      }
    };
    fetchReservedDates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // 시간 문자열을 라벨로 변환
  const formatTimeLabel = (time: string): string => {
    const [hour] = time.split(":").map(Number);
    if (hour < 12) {
      return `오전 ${hour}시`;
    } else if (hour === 12) {
      return "오후 12시";
    } else {
      return `오후 ${hour - 12}시`;
    }
  };

  // 자동 시간 슬롯 생성
  const generateTimeSlots = (start: string, end: string, interval: number): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes < endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const min = currentMinutes % 60;
      slots.push(`${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
      currentMinutes += interval;
    }

    return slots;
  };

  // 선택한 날짜에 맞는 예약 가능 시간 슬롯 계산
  const availableTimeSlots = useMemo(() => {
    // DB에 저장된 시간 슬롯이 없으면 빈 배열
    if (!product.available_time_slots || product.available_time_slots.length === 0) {
      return [];
    }

    // 날짜가 선택되지 않았으면 빈 배열
    if (!selectedDate) {
      return [];
    }

    // 선택한 날짜의 요일 (0=일, 1=월, ... 6=토)
    const dayOfWeek = getDay(selectedDate);

    // 해당 요일의 시간 설정 찾기
    const dayConfig = product.available_time_slots.find(
      (slot) => slot.day === dayOfWeek
    );

    if (!dayConfig) {
      return [];
    }

    // mode에 따라 시간 슬롯 생성
    let timeStrings: string[] = [];

    if (dayConfig.mode === "custom" && dayConfig.customSlots && dayConfig.customSlots.length > 0) {
      // 커스텀 모드: 직접 지정된 시간 사용
      timeStrings = [...dayConfig.customSlots].sort();
    } else {
      // 자동 모드: 간격에 따라 생성 (기본 60분)
      const interval = dayConfig.interval || 60;
      timeStrings = generateTimeSlots(dayConfig.start, dayConfig.end, interval);
    }

    // { time, label } 형식으로 변환
    return timeStrings.map((time) => ({
      time,
      label: formatTimeLabel(time),
    }));
  }, [product.available_time_slots, selectedDate]);

  // 인원 입력 처리
  const handleParticipantsInputChange = (value: string) => {
    setParticipantsInput(value);
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      const clamped = Math.max(product.min_participants, Math.min(product.max_participants, num));
      setParticipants(clamped);
    }
  };

  const handleParticipantsInputBlur = () => {
    // blur 시 올바른 값으로 보정
    setParticipantsInput(String(participants));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    // 날짜 변경 시 시간 초기화
    if (date) {
      setSelectedTime(undefined);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    // 달력은 접지 않고 그대로 유지 (스크롤 이동 방지)
  };

  const discountRate = Math.round(
    ((product.original_price - product.sale_price) / product.original_price) * 100
  );

  // 예약 불가일 계산 (휴무일 + 영업일이 아닌 요일 + 이미 예약된 날짜)
  const isDateUnavailable = (date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayOfWeek = getDay(date);

    // 1. 이미 예약된 날짜 체크 (1일 1예약)
    if (reservedDates.has(dateStr)) {
      return true;
    }

    // 2. 휴무일 체크 (기존 로직)
    const isHoliday = product.unavailable_dates.some((ud) => {
      if (ud.is_recurring && ud.day_of_week !== null) {
        return ud.day_of_week === dayOfWeek;
      }
      return ud.unavailable_date === dateStr;
    });

    if (isHoliday) return true;

    // 3. 영업일이 아닌 요일 체크 (available_time_slots에 해당 요일이 없으면 비활성화)
    const timeSlots = product.available_time_slots;
    if (timeSlots && Array.isArray(timeSlots) && timeSlots.length > 0) {
      const availableDays = timeSlots.map((slot) => slot.day);
      const hasTimeSlotForDay = availableDays.includes(dayOfWeek);
      if (!hasTimeSlotForDay) return true;
    }

    return false;
  };

  // 선택 가능한 날짜 범위 (오늘부터 3개월)
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 90);

  // 옵션 수량 변경
  const handleOptionChange = (optionId: string, delta: number) => {
    setSelectedOptions((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(optionId) || 0;
      const newValue = Math.max(0, current + delta);
      if (newValue === 0) {
        newMap.delete(optionId);
      } else {
        newMap.set(optionId, newValue);
      }
      return newMap;
    });
  };

  // 총 금액 계산
  const calculateTotal = (): number => {
    let total = product.sale_price * participants;

    selectedOptions.forEach((quantity, optionId) => {
      const option = product.options.find((o) => o.id === optionId);
      if (option) {
        total += option.price * quantity;
      }
    });

    return total;
  };

  // 장바구니 담기 (성공 시 true 반환)
  const handleAddToCart = (): boolean => {
    if (!selectedDate) {
      toast.error("예약 날짜를 선택해주세요.");
      return false;
    }

    if (!selectedTime) {
      toast.error("예약 시간을 선택해주세요.");
      return false;
    }

    // 옵션 임시 비활성화
    // const requiredOptions = product.options.filter((o) => o.is_required);
    // const missingRequired = requiredOptions.find((o) => !selectedOptions.has(o.id));
    // if (missingRequired) {
    //   toast.error(`필수 옵션 "${missingRequired.name}"을(를) 선택해주세요.`);
    //   return false;
    // }

    // const options = Array.from(selectedOptions.entries()).map(([optionId, quantity]) => {
    //   const option = product.options.find((o) => o.id === optionId)!;
    //   return {
    //     id: optionId,
    //     name: option.name,
    //     price: option.price,
    //     quantity,
    //   };
    // });
    const options: { id: string; name: string; price: number; quantity: number }[] = [];

    addItem({
      product: {
        id: product.id,
        name: product.name,
        thumbnail: product.thumbnail,
        original_price: product.original_price,
        sale_price: product.sale_price,
        business_owner_name: product.business_owner?.name || "",
        min_participants: product.min_participants,
        max_participants: product.max_participants,
      },
      participants,
      reservationDate: format(selectedDate, "yyyy-MM-dd"),
      reservationTime: selectedTime,
      options,
    });

    toast.success("장바구니에 담았습니다.");
    return true;
  };

  // 바로 예약 (장바구니에 담지 않고 바로 결제 페이지로)
  const handleDirectReservation = () => {
    if (!selectedDate) {
      toast.error("예약 날짜를 선택해주세요.");
      return;
    }

    if (!selectedTime) {
      toast.error("예약 시간을 선택해주세요.");
      return;
    }

    // 옵션 임시 비활성화
    // const requiredOptions = product.options.filter((o) => o.is_required);
    // const missingRequired = requiredOptions.find((o) => !selectedOptions.has(o.id));
    // if (missingRequired) {
    //   toast.error(`필수 옵션 "${missingRequired.name}"을(를) 선택해주세요.`);
    //   return;
    // }

    // const options = Array.from(selectedOptions.entries()).map(([optionId, quantity]) => {
    //   const option = product.options.find((o) => o.id === optionId)!;
    //   return {
    //     id: optionId,
    //     name: option.name,
    //     price: option.price,
    //     quantity,
    //   };
    // });
    const options: { id: string; name: string; price: number; quantity: number }[] = [];

    // 바로예약 전용 아이템으로 설정 (장바구니에 담지 않음)
    setDirectItem({
      product: {
        id: product.id,
        name: product.name,
        thumbnail: product.thumbnail,
        original_price: product.original_price,
        sale_price: product.sale_price,
        business_owner_name: product.business_owner?.name || "",
        min_participants: product.min_participants,
        max_participants: product.max_participants,
      },
      participants,
      reservationDate: format(selectedDate, "yyyy-MM-dd"),
      reservationTime: selectedTime,
      options,
    });

    router.push("/checkout");
  };

  // 찜하기 토글
  const handleWishlistToggle = () => {
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? "찜 목록에서 제거했습니다." : "찜 목록에 추가했습니다.");
  };

  return (
    <div className="space-y-6">
      {/* 카테고리 & 사업주 */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {product.category && (
          <>
            <span>{product.category.name}</span>
            <span>·</span>
          </>
        )}
        {product.business_owner && (
          <span className="flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            {product.business_owner.name}
          </span>
        )}
      </div>

      {/* 상품명 */}
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{product.name}</h1>

      {/* 요약 */}
      {product.summary && <p className="text-gray-600">{product.summary}</p>}

      {/* 메타 정보 */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        {product.region && (
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {product.region}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {product.min_participants}~{product.max_participants}명
        </span>
        {product.duration_minutes && (
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            약 {product.duration_minutes}분
          </span>
        )}
      </div>

      {/* 가격 */}
      <div className="py-4 border-t border-b border-gray-200">
        <div className="flex items-baseline gap-3">
          {discountRate > 0 && (
            <>
              <span className="text-damda-teal font-bold text-xl">{discountRate}%</span>
              <span className="text-gray-400 line-through text-lg">
                {product.original_price.toLocaleString()}원
              </span>
            </>
          )}
          <span className="text-3xl font-bold text-damda-yellow-dark">
            {product.sale_price.toLocaleString()}원
          </span>
          <span className="text-gray-500 text-sm">/인</span>
        </div>
      </div>

      {/* 날짜 & 시간 선택 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4 text-damda-teal" />
            예약 일시
          </label>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              {isCalendarOpen ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  접기
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  변경
                </>
              )}
            </button>
          )}
        </div>

        {/* 선택된 날짜 카드 */}
        {selectedDate && !isCalendarOpen && (
          <div className="flex items-center gap-3 p-4 bg-damda-yellow-light/50 border border-damda-yellow/30 rounded-xl">
            <div className="w-12 h-12 bg-damda-yellow rounded-lg flex flex-col items-center justify-center text-gray-900">
              <span className="text-xs font-medium">{format(selectedDate, "M월", { locale: ko })}</span>
              <span className="text-lg font-bold leading-none">{format(selectedDate, "d")}</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                {format(selectedDate, "yyyy년 M월 d일", { locale: ko })}
                {selectedTime && <span className="text-damda-teal ml-2">{selectedTime}</span>}
              </p>
              <p className="text-sm text-gray-600">
                {format(selectedDate, "EEEE", { locale: ko })}
              </p>
            </div>
            <Check className="w-5 h-5 text-damda-teal" />
          </div>
        )}

        {/* 달력 & 시간 선택 */}
        {isCalendarOpen && (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* 달력 본문 */}
            <div className="p-4">
              <style>{`
                .product-detail-calendar .rdp-root {
                  --rdp-accent-color: #F8B737;
                  --rdp-accent-background-color: #FEF3C7;
                  --rdp-day-height: 40px;
                  --rdp-day-width: 40px;
                  font-size: 14px;
                  margin: 0 auto;
                }
                .product-detail-calendar .rdp-month {
                  width: 100%;
                }
                .product-detail-calendar .rdp-month_caption {
                  padding: 0 0 12px 0;
                }
                .product-detail-calendar .rdp-button_previous,
                .product-detail-calendar .rdp-button_next {
                  width: 32px;
                  height: 32px;
                  border-radius: 8px;
                }
                .product-detail-calendar .rdp-button_previous:hover,
                .product-detail-calendar .rdp-button_next:hover {
                  background-color: #f3f4f6;
                }
                .product-detail-calendar .rdp-weekdays {
                  border-bottom: 1px solid #e5e7eb;
                  padding-bottom: 8px;
                  margin-bottom: 8px;
                }
                .product-detail-calendar .rdp-day_button {
                  font-size: 14px;
                  border-radius: 8px;
                  transition: all 0.15s ease;
                }
                .product-detail-calendar .rdp-day_button:hover:not(:disabled) {
                  background-color: #FEF3C7;
                }
                .product-detail-calendar .rdp-caption_label {
                  font-size: 16px;
                  font-weight: 700;
                  color: #1f2937;
                }
                .product-detail-calendar .rdp-weekday {
                  font-size: 12px;
                  font-weight: 500;
                  color: #6b7280;
                  padding-bottom: 4px;
                }
                /* 일요일 */
                .product-detail-calendar .rdp-weekday:first-child {
                  color: #ef4444;
                }
                .product-detail-calendar .rdp-day:first-child .rdp-day_button:not(.rdp-disabled) {
                  color: #ef4444;
                }
                /* 토요일 */
                .product-detail-calendar .rdp-weekday:last-child {
                  color: #3b82f6;
                }
                .product-detail-calendar .rdp-day:last-child .rdp-day_button:not(.rdp-disabled) {
                  color: #3b82f6;
                }
                .product-detail-calendar .rdp-selected .rdp-day_button {
                  background-color: #F8B737 !important;
                  color: #1f2937 !important;
                  font-weight: 600;
                }
                .product-detail-calendar .rdp-disabled .rdp-day_button {
                  color: #d1d5db !important;
                  text-decoration: line-through;
                }
                .product-detail-calendar .rdp-today:not(.rdp-selected) .rdp-day_button {
                  border: 2px solid #F8B737;
                  font-weight: 600;
                }
              `}</style>
              <div className="product-detail-calendar">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) =>
                    isBefore(date, today) || isAfter(date, maxDate) || isDateUnavailable(date)
                  }
                  locale={ko}
                />
              </div>
            </div>

            {/* 시간 선택 - 항상 표시하여 높이 변동 최소화 */}
            <div className="border-t border-gray-200">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-damda-teal" />
                  {selectedDate
                    ? `${format(selectedDate, "M월 d일", { locale: ko })} 예약 가능 시간`
                    : "시간 선택"}
                </p>
              </div>
              <div className="p-4">
                {selectedDate ? (
                  availableTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableTimeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => handleTimeSelect(slot.time)}
                          className={cn(
                            "relative p-3 rounded-lg border-2 transition-all text-center",
                            selectedTime === slot.time
                              ? "border-damda-yellow bg-damda-yellow-light/50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <span className={cn(
                            "text-base font-semibold block",
                            selectedTime === slot.time ? "text-gray-900" : "text-gray-700"
                          )}>
                            {slot.time}
                          </span>
                          <span className={cn(
                            "text-xs",
                            selectedTime === slot.time ? "text-gray-700" : "text-gray-500"
                          )}>
                            {slot.label}
                          </span>
                          {selectedTime === slot.time && (
                            <div className="absolute top-1 right-1">
                              <Check className="w-4 h-4 text-damda-teal" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">
                      해당 날짜는 예약 가능한 시간이 없습니다
                    </p>
                  )
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    먼저 날짜를 선택해주세요
                  </p>
                )}
              </div>
            </div>

            {/* 범례 */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border-2 border-damda-yellow"></span>
                오늘
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-damda-yellow"></span>
                선택됨
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-200 line-through text-[8px] flex items-center justify-center">x</span>
                예약불가
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 인원 선택 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          <Users className="w-4 h-4 inline mr-1" />
          인원 선택
        </label>
        <div className="flex items-center gap-4">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                const newVal = Math.max(product.min_participants, participants - 1);
                setParticipants(newVal);
                setParticipantsInput(String(newVal));
              }}
              disabled={participants <= product.min_participants}
              className="h-10 w-10 rounded-none"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <input
              type="number"
              value={participantsInput}
              onChange={(e) => handleParticipantsInputChange(e.target.value)}
              onBlur={handleParticipantsInputBlur}
              min={product.min_participants}
              max={product.max_participants}
              className="w-16 h-10 text-center font-medium border-x border-gray-200 focus:outline-none focus:ring-2 focus:ring-damda-yellow focus:ring-inset [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                const newVal = Math.min(product.max_participants, participants + 1);
                setParticipants(newVal);
                setParticipantsInput(String(newVal));
              }}
              disabled={participants >= product.max_participants}
              className="h-10 w-10 rounded-none"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-sm text-gray-500">
            ({product.min_participants}~{product.max_participants}명)
          </span>
        </div>
      </div>

      {/* 옵션 선택 - 임시 비활성화 */}
      {/* {product.options.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">추가 옵션</label>
          <div className="space-y-2">
            {product.options.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <span className="font-medium">{option.name}</span>
                  {option.is_required && (
                    <Badge className="ml-2 text-xs bg-damda-teal text-white">
                      필수
                    </Badge>
                  )}
                  <span className="text-gray-500 ml-2">
                    +{option.price.toLocaleString()}원
                  </span>
                </div>
                <div className="flex items-center border rounded-lg">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOptionChange(option.id, -1)}
                    className="h-8 w-8"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">
                    {selectedOptions.get(option.id) || 0}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOptionChange(option.id, 1)}
                    className="h-8 w-8"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* 총 금액 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-700 font-medium">총 예상 금액</span>
          <span className="text-2xl font-bold text-damda-yellow-dark">
            {calculateTotal().toLocaleString()}원
          </span>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-12 w-12 flex-shrink-0",
            isWishlisted && "bg-damda-yellow border-damda-yellow"
          )}
          onClick={handleWishlistToggle}
        >
          <Heart
            className={cn("w-5 h-5", isWishlisted && "fill-current text-gray-900")}
          />
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={handleAddToCart}
          disabled={product.is_sold_out}
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          장바구니
        </Button>
        <Button
          className="flex-1 h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900"
          onClick={handleDirectReservation}
          disabled={product.is_sold_out}
        >
          {product.is_sold_out ? "품절" : "바로 예약"}
        </Button>
      </div>
    </div>
  );
}
