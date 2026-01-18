import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Calendar,
  Heart,
  Star,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  HelpCircle,
  Megaphone,
  Settings,
  LogOut,
  Clock,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import {
  getDaycareInfo,
  getMyReservations,
  type Reservation,
} from "@/services/mypageService";

// 어린이집 상태
const DAYCARE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  requested: "bg-blue-100 text-blue-800",
};

const DAYCARE_STATUS_LABELS: Record<string, string> = {
  pending: "승인 대기",
  approved: "승인됨",
  rejected: "반려됨",
  requested: "검토 중",
};

// 예약 상태
const RESERVATION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-red-100 text-red-800",
};

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  confirmed: "예약 확정",
  completed: "체험 완료",
  cancelled: "취소됨",
  refunded: "환불됨",
};

export default async function MypagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [daycare, recentReservations, wishlistCount, reviewCount] =
    await Promise.all([
      getDaycareInfo(user.id),
      getMyReservations(user.id, undefined, 1, 3), // 최근 3개만
      getWishlistCount(user.id),
      getReviewCount(user.id),
    ]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        {/* 어린이집 정보 */}
        <section className="px-4 py-6 border-b border-gray-200">
          {daycare ? (
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-damda-yellow-light flex items-center justify-center flex-shrink-0">
                <Building2 className="w-8 h-8 text-damda-yellow" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-gray-900 truncate">
                    {daycare.name}
                  </h1>
                  <Badge className={DAYCARE_STATUS_COLORS[daycare.status] || DAYCARE_STATUS_COLORS.pending}>
                    {DAYCARE_STATUS_LABELS[daycare.status] || "확인 중"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  인가번호: {daycare.license_number}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {daycare.contact_phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {daycare.email}
                  </span>
                </div>
              </div>
              <Link
                href="/mypage/profile"
                className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 flex-shrink-0"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 mb-1">어린이집 정보가 등록되지 않았습니다.</p>
                <Link
                  href="/mypage/profile"
                  className="text-sm text-damda-yellow hover:text-damda-yellow-dark font-medium"
                >
                  정보 등록하기 →
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 최근 예약 */}
        <section className="border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">최근 예약</h2>
            <Link
              href="/mypage/reservations"
              className="text-sm text-gray-400 hover:text-damda-yellow flex items-center"
            >
              전체 {recentReservations.total}건
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {recentReservations.data.length > 0 ? (
            recentReservations.data.map((reservation, index) => (
              <ReservationItem
                key={reservation.id}
                reservation={reservation}
                isLast={index === recentReservations.data.length - 1}
              />
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-400">
              <p>예약 내역이 없습니다.</p>
              <Link
                href="/products"
                className="inline-block mt-2 text-sm text-damda-yellow hover:text-damda-yellow-dark"
              >
                체험 둘러보기
              </Link>
            </div>
          )}
        </section>

        {/* 나의 활동 */}
        <section className="border-b border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">나의 활동</h2>
          </div>
          <Link
            href="/mypage/wishlist"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">찜 목록</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-sm">{wishlistCount}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
          <Link
            href="/mypage/reviews"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">내 리뷰</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-sm">{reviewCount}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        </section>

        {/* 고객 지원 */}
        <section className="border-b border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">고객 지원</h2>
          </div>
          <Link
            href="/notice"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">공지사항</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Link
            href="/faq"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">자주 묻는 질문</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        </section>

        {/* 로그아웃 */}
        <div className="px-4 py-6">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// 헬퍼 함수들
async function getWishlistCount(daycareId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("wishlists")
    .select("*", { count: "exact", head: true })
    .eq("daycare_id", daycareId);
  return count || 0;
}

async function getReviewCount(daycareId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("daycare_id", daycareId);
  return count || 0;
}

// 예약 아이템 컴포넌트
function ReservationItem({
  reservation,
  isLast,
}: {
  reservation: Reservation;
  isLast: boolean;
}) {
  const formattedDate = format(new Date(reservation.reserved_date), "M월 d일 (E)", {
    locale: ko,
  });

  return (
    <Link
      href={`/mypage/reservations/${reservation.id}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
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
            RESERVATION_STATUS_COLORS[reservation.status] || "bg-gray-100 text-gray-800"
          } text-xs mb-1`}
        >
          {RESERVATION_STATUS_LABELS[reservation.status] || reservation.status}
        </Badge>
        <p className="text-sm font-medium text-gray-900">
          {reservation.total_amount.toLocaleString()}원
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </Link>
  );
}
