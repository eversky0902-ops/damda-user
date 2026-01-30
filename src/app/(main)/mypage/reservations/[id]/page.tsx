import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Phone,
  ChevronLeft,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getReservationById } from "@/services/mypageService";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ReservationActions } from "./reservation-actions";

const STATUS_CONFIG = {
  pending: {
    label: "결제 대기",
    color: "bg-gray-100 text-gray-800",
    icon: Clock,
    description: "결제를 진행해주세요.",
  },
  paid: {
    label: "결제 완료",
    color: "bg-blue-100 text-blue-800",
    icon: Clock,
    description: "사업자가 예약을 확인 중입니다.",
  },
  confirmed: {
    label: "예약 확정",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    description: "예약이 확정되었습니다. 체험일에 방문해주세요!",
  },
  completed: {
    label: "체험 완료",
    color: "bg-damda-yellow-light text-damda-yellow-dark",
    icon: CheckCircle,
    description: "체험이 완료되었습니다. 리뷰를 남겨주세요!",
  },
  cancelled: {
    label: "취소됨",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    description: "예약이 취소되었습니다.",
  },
  refunded: {
    label: "환불 완료",
    color: "bg-gray-100 text-gray-800",
    icon: XCircle,
    description: "환불이 완료되었습니다.",
  },
};

type ReservationStatus = keyof typeof STATUS_CONFIG;

interface ReservationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservationDetailPage({
  params,
}: ReservationDetailPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const reservation = await getReservationById(id, user.id);

  if (!reservation) {
    notFound();
  }

  const status = STATUS_CONFIG[reservation.status as ReservationStatus];
  const StatusIcon = status?.icon || Clock;
  const formattedDate = format(
    parseISO(reservation.reserved_date),
    "yyyy년 M월 d일 (EEEE)",
    { locale: ko }
  );

  const canCancel = ["pending", "paid", "confirmed"].includes(reservation.status);
  const canReview = reservation.status === "completed";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center h-14 px-4">
          <Link
            href="/mypage/reservations"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="flex-1 text-center font-semibold text-gray-900">
            예약 상세
          </h1>
          <div className="w-5" />
        </div>
      </div>

      {/* 상태 배너 */}
      <div className={`px-4 py-4 ${status?.color || "bg-gray-100"}`}>
        <div className="flex items-center gap-3">
          <StatusIcon className="w-6 h-6" />
          <div>
            <p className="font-semibold">{status?.label || reservation.status}</p>
            <p className="text-sm opacity-80">{status?.description}</p>
          </div>
        </div>
      </div>

      {/* 상품 정보 */}
      <section className="bg-white border-b border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">예약 상품</h2>
        </div>
        <Link
          href={`/products/${reservation.product_id}`}
          className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50"
        >
          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
            {reservation.product?.thumbnail ? (
              <Image
                src={reservation.product.thumbnail}
                alt={reservation.product?.name || "상품"}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 line-clamp-2">
              {reservation.product?.name || "상품 정보 없음"}
            </p>
            {reservation.product?.business_owner?.name && (
              <p className="text-sm text-gray-500 mt-1">
                {reservation.product.business_owner.name}
              </p>
            )}
          </div>
        </Link>
      </section>

      {/* 예약 정보 */}
      <section className="bg-white border-b border-gray-200 mt-2">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">예약 정보</h2>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">예약일</p>
              <p className="font-medium text-gray-900">{formattedDate}</p>
            </div>
          </div>

          {reservation.reserved_time && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">예약 시간</p>
                <p className="font-medium text-gray-900">
                  {reservation.reserved_time}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">참가 인원</p>
              <p className="font-medium text-gray-900">
                {reservation.participant_count}명
              </p>
            </div>
          </div>

          {reservation.memo && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">요청사항</p>
                <p className="font-medium text-gray-900">{reservation.memo}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 체험 장소 */}
      {(reservation.product as any)?.address && (
        <section className="bg-white border-b border-gray-200 mt-2">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">체험 장소</h2>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  {(reservation.product as any).address}
                </p>
                {(reservation.product as any).address_detail && (
                  <p className="text-sm text-gray-500">
                    {(reservation.product as any).address_detail}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 사업자 연락처 */}
      {(reservation.product?.business_owner as any)?.contact_phone && (
        <section className="bg-white border-b border-gray-200 mt-2">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">연락처</h2>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">
                  {reservation.product?.business_owner?.name}
                </p>
                <a
                  href={`tel:${(reservation.product?.business_owner as any).contact_phone}`}
                  className="font-medium text-damda-yellow-dark"
                >
                  {(reservation.product?.business_owner as any).contact_phone}
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 결제 정보 */}
      <section className="bg-white border-b border-gray-200 mt-2">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">결제 정보</h2>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">예약번호</span>
            <span className="font-mono text-sm text-gray-900">
              {reservation.reservation_number}
            </span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">결제 금액</span>
            <span className="font-semibold text-gray-900">
              {reservation.total_amount.toLocaleString()}원
            </span>
          </div>
        </div>
      </section>

      {/* 취소 사유 (취소된 경우) */}
      {reservation.cancel_reason && (
        <section className="bg-white border-b border-gray-200 mt-2">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-red-600">취소 사유</h2>
          </div>
          <div className="px-4 py-4">
            <p className="text-gray-700">{reservation.cancel_reason}</p>
            {reservation.cancelled_at && (
              <p className="text-sm text-gray-500 mt-2">
                취소일:{" "}
                {format(parseISO(reservation.cancelled_at), "yyyy.MM.dd HH:mm")}
              </p>
            )}
          </div>
        </section>
      )}

      {/* 액션 버튼 */}
      <ReservationActions
        reservationId={reservation.id}
        canReview={canReview}
        canCancel={canCancel}
      />
    </div>
  );
}
