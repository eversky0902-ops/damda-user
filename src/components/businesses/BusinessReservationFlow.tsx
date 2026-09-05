"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, addHours, format, getDay, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, Check, Minus, Plus, Users } from "lucide-react";
import { BusinessProductCard } from "@/components/businesses/BusinessProductCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReservationSettings } from "@/hooks/use-reservation-settings";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import { getUnavailableDates } from "@/services/holdService";
import type { Product } from "@/services/productService";
import type { CartItem } from "@/stores/cart-store";
import { toast } from "sonner";

interface BusinessReservationFlowProps {
  products: Product[];
  businessLogo?: string | null;
  isPreview?: boolean;
  previewProductId?: string;
}

export function BusinessReservationFlow({
  products,
  businessLogo,
  isPreview = false,
  previewProductId,
}: BusinessReservationFlowProps) {
  const router = useRouter();
  const { addItem, setDirectItem } = useCart();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [participants, setParticipants] = useState(0);
  const [participantsInput, setParticipantsInput] = useState("0");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const participantControlRef = useRef<HTMLDivElement>(null);
  const { reservationAdvanceDays, minReservationNotice } = useReservationSettings();

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const globalMinimumDate = startOfDay(addDays(new Date(), Math.ceil(minReservationNotice / 24)));
  const globalMaximumDate = addDays(startOfDay(new Date()), reservationAdvanceDays);
  const parseDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  const productLeadDate = selectedProduct
    ? startOfDay(addHours(new Date(), selectedProduct.booking_cutoff_hours ?? 24))
    : globalMinimumDate;
  const sameDayFloor = selectedProduct?.allow_same_day_booking ? startOfDay(new Date()) : startOfDay(addDays(new Date(), 1));
  const configuredStart = selectedProduct?.booking_start_date ? parseDate(selectedProduct.booking_start_date) : globalMinimumDate;
  const configuredEnd = selectedProduct?.booking_end_date ? parseDate(selectedProduct.booking_end_date) : globalMaximumDate;
  const minimumDate = new Date(Math.max(globalMinimumDate.getTime(), productLeadDate.getTime(), sameDayFloor.getTime(), configuredStart.getTime()));
  const maximumDate = new Date(Math.min(globalMaximumDate.getTime(), configuredEnd.getTime()));

  useEffect(() => {
    if (!selectedProductId) return;
    if (isPreview) return;

    let active = true;
    getUnavailableDates(selectedProductId)
      .then((dates) => active && setUnavailableDates(new Set(dates)))
      .catch(() => active && setUnavailableDates(new Set()));
    return () => { active = false; };
  }, [isPreview, selectedProductId]);

  useEffect(() => {
    if (!previewProductId) return;
    const previewProduct = products.find((product) => product.id === previewProductId);
    if (previewProduct) selectProduct(previewProduct);
    // 미리보기 대상은 최초 진입 때 한 번만 자동 선택합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewProductId]);

  const selectProduct = (product: Product) => {
    setUnavailableDates(new Set());
    setSelectedProductId(product.id);
    setSelectedDate(undefined);
    setParticipants(product.min_participants);
    setParticipantsInput(String(product.min_participants));
    setCalendarOpen(false);
    window.setTimeout(() => dateButtonRef.current?.focus(), 50);
  };

  const selectDate = (date?: Date) => {
    if (!date) return;
    setSelectedDate(date);
    setCalendarOpen(false);
    window.setTimeout(() => participantControlRef.current?.focus(), 50);
  };

  const isDateDisabled = (date: Date) => {
    const normalized = startOfDay(date);
    if (normalized < minimumDate || normalized > maximumDate) return true;
    if (unavailableDates.has(format(date, "yyyy-MM-dd"))) return true;
    const slots = selectedProduct?.available_time_slots || [];
    return slots.length > 0 && !slots.some((slot) => slot.day === getDay(date));
  };

  const adjustParticipants = (value: number) => {
    if (!selectedProduct) return;
    const next = Math.max(selectedProduct.min_participants, Math.min(selectedProduct.max_participants, value));
    setParticipants(next);
    setParticipantsInput(String(next));
  };

  const handleParticipantsInput = (value: string) => {
    if (!/^\d*$/.test(value)) return;
    setParticipantsInput(value);
    if (!selectedProduct || value === "") return;
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      setParticipants(Math.max(selectedProduct.min_participants, Math.min(selectedProduct.max_participants, parsed)));
    }
  };

  const getReservationTime = () => {
    if (!selectedProduct || !selectedDate) return null;
    const dayConfig = (selectedProduct.available_time_slots || []).find((slot) => slot.day === getDay(selectedDate));
    if (!dayConfig) return null;
    if (dayConfig.mode === "custom" && dayConfig.customSlots?.length) {
      return [...dayConfig.customSlots].sort()[0];
    }
    return dayConfig.start || null;
  };

  const buildCartItem = (): CartItem | null => {
    if (!selectedProduct) {
      toast.info("상품을 먼저 선택해주세요.");
      return null;
    }
    if (!selectedDate) {
      setCalendarOpen(true);
      window.setTimeout(() => dateButtonRef.current?.focus(), 50);
      toast.info("방문일을 먼저 선택해주세요.");
      return null;
    }

    const reservationTime = getReservationTime();
    if (!reservationTime) {
      toast.error("선택한 날짜의 예약 가능 시간을 확인할 수 없습니다.");
      return null;
    }

    const normalizedParticipants = Math.max(
      selectedProduct.min_participants,
      Math.min(selectedProduct.max_participants, Number(participantsInput) || selectedProduct.min_participants)
    );
    adjustParticipants(normalizedParticipants);
    return {
      product: {
        id: selectedProduct.id,
        name: selectedProduct.name,
        thumbnail: selectedProduct.thumbnail || "",
        original_price: selectedProduct.original_price,
        sale_price: selectedProduct.sale_price,
        business_owner_name: selectedProduct.business_owner?.name || selectedProduct.business?.name || "",
        min_participants: selectedProduct.min_participants,
        max_participants: selectedProduct.max_participants,
      },
      participants: normalizedParticipants,
      reservationDate: format(selectedDate, "yyyy-MM-dd"),
      reservationTime,
      options: [],
    };
  };

  const handleAddToCart = async () => {
    if (isPreview) {
      toast.info("미리보기에서는 장바구니 기능을 사용할 수 없습니다.");
      return;
    }
    const item = buildCartItem();
    if (!item) return;
    await addItem(item);
    toast.success("장바구니에 담았습니다.");
  };

  const handleCheckout = () => {
    if (isPreview) {
      toast.info("미리보기에서는 예약 기능을 사용할 수 없습니다.");
      return;
    }
    const item = buildCartItem();
    if (!item) return;
    setDirectItem(item);
    router.push("/checkout");
  };

  return (
    <>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Popover open={calendarOpen} onOpenChange={(open) => selectedProduct && setCalendarOpen(open)}>
          <PopoverTrigger asChild>
            <button
              ref={dateButtonRef}
              type="button"
              disabled={!selectedProduct}
              className={cn(
                "flex min-h-24 items-center gap-3 rounded-xl border bg-white px-4 py-4 text-left transition-all",
                !selectedProduct && "cursor-not-allowed border-gray-200 opacity-70",
                selectedProduct && !selectedDate && "border-damda-yellow ring-2 ring-damda-yellow/30 hover:bg-damda-yellow-light/30",
                selectedDate && "border-damda-teal bg-damda-teal-light/30"
              )}
            >
              <CalendarDays className={cn("h-5 w-5 shrink-0", selectedProduct ? "text-damda-yellow-dark" : "text-gray-400")} />
              <span>
                <span className="block text-xs text-gray-500">방문일</span>
                <strong className="mt-0.5 block text-sm text-gray-900">
                  {selectedDate
                    ? format(selectedDate, "yyyy년 M월 d일 (E)", { locale: ko })
                    : selectedProduct
                      ? "방문일을 선택해주세요"
                      : "상품 선택 후 방문일 입력"}
                </strong>
                {selectedProduct && !selectedDate && <span className="mt-1 block text-xs font-medium text-damda-yellow-dark">다음 단계</span>}
              </span>
              {selectedDate && <Check className="ml-auto h-5 w-5 text-damda-teal" />}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-2">
            <Calendar
              mode="single"
              locale={ko}
              selected={selectedDate}
              onSelect={selectDate}
              disabled={isDateDisabled}
              defaultMonth={selectedDate || minimumDate}
            />
          </PopoverContent>
        </Popover>

        <div
          ref={participantControlRef}
          tabIndex={-1}
          className={cn(
            "flex min-h-24 items-center gap-3 rounded-xl border bg-white px-4 py-4 outline-none transition-all",
            !selectedDate && "border-gray-200 opacity-70",
            selectedDate && "border-damda-yellow ring-2 ring-damda-yellow/30 focus:ring-4"
          )}
        >
          <Users className={cn("h-5 w-5 shrink-0", selectedDate ? "text-damda-yellow-dark" : "text-gray-400")} />
          <div className="min-w-0 flex-1">
            <span className="block text-xs text-gray-500">이용 인원</span>
            {!selectedDate || !selectedProduct ? (
              <strong className="mt-0.5 block text-sm text-gray-900">방문일 설정 후 인원 입력</strong>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  {participants}명 <span className="font-normal text-gray-500">({selectedProduct.min_participants}~{selectedProduct.max_participants}명)</span>
                </span>
                <div className="flex items-center gap-2" aria-label="이용 인원 선택">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    disabled={participants <= selectedProduct.min_participants}
                    onClick={() => adjustParticipants(participants - 1)}
                    aria-label="인원 빼기"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={participantsInput}
                    onChange={(event) => handleParticipantsInput(event.target.value)}
                    onBlur={() => adjustParticipants(participants)}
                    className="h-9 w-12 rounded-md border border-gray-200 bg-white text-center text-base font-bold outline-none focus:border-damda-yellow focus:ring-2 focus:ring-damda-yellow/30"
                    aria-label="이용 인원 직접 입력"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-damda-yellow text-gray-950 hover:bg-damda-yellow-dark"
                    disabled={participants >= selectedProduct.max_participants}
                    onClick={() => adjustParticipants(participants + 1)}
                    aria-label="인원 추가"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {products.map((product) => (
          <BusinessProductCard
            key={product.id}
            product={product}
            businessLogo={businessLogo}
            selected={selectedProductId === product.id}
            onSelect={() => selectProduct(product)}
            onAddToCart={handleAddToCart}
            onReserve={handleCheckout}
            selectionMode
            isPreview={isPreview}
          />
        ))}
      </div>

      {selectedProduct && selectedDate && (
        <div className="sticky bottom-3 z-30 mt-6 rounded-2xl border border-damda-yellow bg-white/95 p-3 shadow-xl backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-4">
          <div className="mb-3 min-w-0 sm:mb-0">
            <p className="truncate text-sm font-bold text-gray-950">{selectedProduct.name}</p>
            <p className="mt-1 text-xs text-gray-600">
              {format(selectedDate, "M월 d일 (E)", { locale: ko })} · {participants}명
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddToCart}
              className="h-12 flex-1 px-4 text-base font-bold sm:flex-none"
            >
              장바구니 담기
            </Button>
            <Button onClick={handleCheckout} className="h-12 flex-1 bg-damda-yellow px-6 text-base font-bold text-gray-950 hover:bg-damda-yellow-dark sm:flex-none">
              예약하기
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
