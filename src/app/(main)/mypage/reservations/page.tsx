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

      {/* 예약 캘린더 */}
      {reservations.length === 0 ? (
        <EmptyState />
      ) : (
        <ReservationCalendar reservations={reservations} />
      )}

    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">예약 내역이 없습니다</h3>
      <p className="text-gray-500 mb-6">새로운 체험을 예약해보세요!</p>
      <Button asChild className="bg-damda-yellow hover:bg-damda-yellow-dark">
        <Link href="/products">체험 상품 둘러보기</Link>
      </Button>
    </div>
  );
}
