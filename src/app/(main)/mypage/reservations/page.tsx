import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar,
  Users,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getMyReservations, type Reservation } from "@/services/mypageService";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ReservationTabs } from "./reservation-tabs";

const STATUS_CONFIG = {
  pending: { label: "결제 대기", color: "bg-gray-100 text-gray-800", icon: Clock },
  paid: { label: "결제 완료", color: "bg-blue-100 text-blue-800", icon: Clock },
  confirmed: { label: "예약 확정", color: "bg-green-100 text-green-800", icon: CheckCircle },
  completed: { label: "체험 완료", color: "bg-damda-yellow-light text-damda-yellow-dark", icon: CheckCircle },
  cancelled: { label: "취소됨", color: "bg-red-100 text-red-800", icon: XCircle },
  refunded: { label: "환불 완료", color: "bg-gray-100 text-gray-800", icon: XCircle },
};

type ReservationStatus = keyof typeof STATUS_CONFIG;

interface ReservationsPageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
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
  const page = parseInt(params.page || "1", 10);

  const { data: reservations, total } = await getMyReservations(user.id, status, page, 10);
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">예약 내역</h1>
      </div>

      {/* 탭 필터 */}
      <ReservationTabs currentStatus={status} />

      {/* 예약 목록 */}
      {reservations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/mypage/reservations?status=${status}&page=${p}`}
              className={`px-3 py-1 rounded-md text-sm ${
                p === page
                  ? "bg-damda-yellow text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const status = STATUS_CONFIG[reservation.status as ReservationStatus];
  const StatusIcon = status?.icon || Clock;

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 이미지 */}
          <Link
            href={`/products/${reservation.product?.id}`}
            className="relative w-full sm:w-32 h-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
          >
            <Image
              src={reservation.product?.thumbnail || "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&q=80"}
              alt={reservation.product?.name || ""}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 128px"
            />
          </Link>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <Badge className={status?.color || "bg-gray-100 text-gray-800"}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status?.label || reservation.status}
              </Badge>
              <span className="text-xs text-gray-500">
                {reservation.reservation_number}
              </span>
            </div>

            {/* 상품명 */}
            <Link
              href={`/products/${reservation.product?.id}`}
              className="font-medium text-gray-900 hover:text-damda-yellow-dark line-clamp-1 mb-1"
            >
              {reservation.product?.name}
            </Link>
            <p className="text-xs text-gray-500 mb-2">
              {reservation.product?.business_owner?.name}
            </p>

            {/* 예약 정보 */}
            <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(parseISO(reservation.reserved_date), "yyyy.MM.dd (EEE)", {
                  locale: ko,
                })}
                {reservation.reserved_time && ` ${reservation.reserved_time}`}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {reservation.participant_count}명
              </span>
            </div>

            {/* 취소 사유 */}
            {reservation.status === "cancelled" && reservation.cancel_reason && (
              <p className="text-sm text-red-600 mb-3 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {reservation.cancel_reason}
              </p>
            )}

            {/* 금액 & 버튼 */}
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">
                {reservation.total_amount.toLocaleString()}원
              </span>
              <div className="flex gap-2">
                {reservation.status === "completed" && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/mypage/reviews/new?reservationId=${reservation.id}`}>
                      리뷰 작성
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/mypage/reservations/${reservation.id}`}>
                    상세보기
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
