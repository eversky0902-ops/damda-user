import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">예약 내역</h1>
      </div>

      {/* 탭 필터 */}
      <div className="mb-4">
        <ReservationTabs currentStatus={status} />
      </div>

      {/* 예약 목록 */}
      {reservations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="border-t border-gray-200">
          {reservations.map((reservation, index) => (
            <ReservationItem
              key={reservation.id}
              reservation={reservation}
              isLast={index === reservations.length - 1}
            />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-6">
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

function ReservationItem({
  reservation,
  isLast,
}: {
  reservation: Reservation;
  isLast: boolean;
}) {
  const status = STATUS_CONFIG[reservation.status as ReservationStatus];
  const formattedDate = format(parseISO(reservation.reserved_date), "M월 d일 (E)", {
    locale: ko,
  });

  return (
    <Link
      href={`/mypage/reservations/${reservation.id}`}
      className={`flex items-center gap-3 py-3 hover:bg-gray-50 transition-colors ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      {/* 상품 썸네일 */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
        {reservation.product?.thumbnail ? (
          <Image
            src={reservation.product.thumbnail}
            alt={reservation.product?.name || "상품"}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>

      {/* 예약 정보 */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate text-sm">
          {reservation.product?.name || "상품 정보 없음"}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <span>{formattedDate}</span>
          {reservation.reserved_time && (
            <>
              <span>·</span>
              <span>{reservation.reserved_time}</span>
            </>
          )}
          <span>·</span>
          <span>{reservation.participant_count}명</span>
        </div>
      </div>

      {/* 상태 및 금액 */}
      <div className="text-right flex-shrink-0">
        <Badge
          className={`${
            status?.color || "bg-gray-100 text-gray-800"
          } text-xs mb-1`}
        >
          {status?.label || reservation.status}
        </Badge>
        <p className="text-sm font-medium text-gray-900">
          {reservation.total_amount.toLocaleString()}원
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </Link>
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
