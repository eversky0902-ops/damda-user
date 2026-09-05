import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getMyReservations, type Reservation } from "@/services/mypageService";
import { ReservationTabs } from "./reservation-tabs";
import { ReservationCalendar } from "./reservation-calendar";

interface ReservationsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ReservationsPage({ searchParams }: ReservationsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const status = params.status || "all";

  const { data: reservations } = await getMyReservations(user.id, status, 1, 1000);

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">예약 내역</h1>
      </div>

      {/* 탭 필터 */}
      <div className="mb-4">
        <ReservationTabs currentStatus={status} />
      </div>

      {/* 예약 캘린더는 예약이 없어도 항상 표시합니다. */}
      <ReservationCalendar reservations={reservations} />

      {/* 캘린더 아래 예약 내역 텍스트 목록 */}
      <ReservationHistory reservations={reservations} />

    </div>
  );
}

const STATUS_LABELS: Record<Reservation["status"], string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  confirmed: "예약 확정",
  completed: "체험 완료",
  cancelled: "취소됨",
  refunded: "환불 완료",
};

function ReservationHistory({ reservations }: { reservations: Reservation[] }) {
  if (reservations.length === 0) {
    return (
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900">예약 내역이 없습니다</h2>
        <p className="mt-2 text-sm text-gray-500">새로운 체험을 예약해보세요!</p>
        <Button asChild className="mt-5 bg-damda-yellow hover:bg-damda-yellow-dark">
          <Link href="/products">체험 상품 둘러보기</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
        <h2 className="text-lg font-bold text-gray-900">예약 내역</h2>
        <p className="mt-1 text-sm text-gray-500">예약을 클릭하면 상세정보를 확인할 수 있습니다.</p>
      </div>
      <div className="divide-y divide-gray-100">
        {reservations.map((reservation) => (
          <Link
            key={reservation.id}
            href={`/mypage/reservations/${reservation.id}`}
            className="block px-4 py-4 transition-colors hover:bg-gray-50 sm:px-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-gray-900">
                  {reservation.product?.name || "상품 정보 없음"}
                </h3>
                {reservation.product?.business_owner?.name && (
                  <p className="mt-1 text-sm text-gray-500">
                    {reservation.product.business_owner.name}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                {STATUS_LABELS[reservation.status]}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
              <span>{formatReservationDate(reservation.reserved_date)}</span>
              {reservation.reserved_time && <span>{reservation.reserved_time}</span>}
              <span>{reservation.participant_count.toLocaleString()}명</span>
              <span className="font-semibold text-gray-900">
                {reservation.total_amount.toLocaleString()}원
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function formatReservationDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${year}.${month}.${day}` : value;
}
