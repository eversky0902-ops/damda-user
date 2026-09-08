"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import type { Reservation } from "@/services/mypageService";

interface ReservationCalendarProps {
  reservations: Reservation[];
}

export function ReservationCalendar({ reservations }: ReservationCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
      }),
    [month],
  );

  const reservationsByDay = useMemo(() => {
    const grouped = new Map<string, Reservation[]>();
    reservations.forEach((reservation) => {
      const key = reservation.reserved_date;
      grouped.set(key, [...(grouped.get(key) || []), reservation]);
    });
    return grouped;
  }, [reservations]);

  return (
    <section aria-label="예약 캘린더" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={() => setMonth((current) => addMonths(current, -1))}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          aria-label="이전 달"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">{format(month, "yyyy년 M월", { locale: ko })}</h2>
        <button
          type="button"
          onClick={() => setMonth((current) => addMonths(current, 1))}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          aria-label="다음 달"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100 text-center text-xs font-semibold text-gray-500">
        {(["일", "월", "화", "수", "목", "금", "토"] as const).map((day, index) => (
          <div key={day} className={`py-3 ${index === 0 ? "text-red-400" : index === 6 ? "text-blue-400" : ""}`}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayReservations = reservationsByDay.get(key) || [];
          const inMonth = isSameMonth(day, month);
          return (
            <div key={key} className={`min-h-28 border-b border-r border-gray-100 p-1.5 sm:min-h-32 sm:p-2 ${inMonth ? "bg-white" : "bg-gray-50/70"}`}>
              <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${inMonth ? "text-gray-700" : "text-gray-300"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayReservations.map((reservation) => {
                  const productName = reservation.product?.name || "상품 정보 없음";
                  const cancellationLabel = reservation.status === "refunded"
                    ? "환불 완료"
                    : reservation.status === "cancelled"
                      ? "취소"
                      : null;

                  return (
                    <Link
                      key={reservation.id}
                      href={`/mypage/reservations/${reservation.id}`}
                      className={`block rounded-md px-1.5 py-1 text-left text-[11px] leading-tight transition-colors ${cancellationLabel
                        ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        : "bg-damda-yellow-light text-gray-900 hover:bg-damda-yellow"}`}
                      title={cancellationLabel ? `${productName} (${cancellationLabel})` : productName}
                    >
                      <span className={`block truncate font-semibold ${cancellationLabel ? "line-through" : ""}`}>
                        {productName}
                      </span>
                      {cancellationLabel && (
                        <span className="mt-0.5 block break-keep text-[10px] font-semibold leading-snug text-gray-700">
                          {cancellationLabel}
                        </span>
                      )}
                      <span className="mt-0.5 flex min-w-0 items-center gap-0.5 text-[10px] text-gray-600">
                        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{reservation.reserved_time || `${reservation.participant_count}명`}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-500 sm:px-6">
        <span className="h-2.5 w-2.5 rounded-full bg-damda-yellow" aria-hidden="true" />
        예약을 선택하면 상세 내역을 확인할 수 있습니다.
      </div>
    </section>
  );
}
