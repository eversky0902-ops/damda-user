import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  Calendar,
  Heart,
  Star,
  MessageSquare,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import {
  getDaycareInfo,
  getReservationStats,
} from "@/services/mypageService";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  requested: "bg-blue-100 text-blue-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "승인 대기",
  approved: "승인됨",
  rejected: "반려됨",
  requested: "검토 중",
};

export default async function MypagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 병렬로 데이터 가져오기
  const [daycare, reservationStats, wishlistCount, reviewCount, inquiryCount] =
    await Promise.all([
      getDaycareInfo(user.id),
      getReservationStats(user.id),
      getWishlistCount(user.id),
      getReviewCount(user.id),
      getInquiryCount(user.id),
    ]);

  return (
    <div className="space-y-6">
      {/* 어린이집 정보 카드 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-damda-yellow" />
            어린이집 정보
          </CardTitle>
          {daycare && (
            <Badge className={STATUS_COLORS[daycare.status] || STATUS_COLORS.pending}>
              {STATUS_LABELS[daycare.status] || "확인 중"}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {daycare ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{daycare.name}</h3>
                <p className="text-sm text-gray-500">
                  인가번호: {daycare.license_number}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  {daycare.contact_phone}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  {daycare.email}
                </div>
                <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  {daycare.address}
                  {daycare.address_detail && ` ${daycare.address_detail}`}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/mypage/profile">
                  정보 수정
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>어린이집 정보가 등록되지 않았습니다.</p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/mypage/profile">정보 등록하기</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 예약 현황 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-damda-yellow" />
            예약 현황
          </CardTitle>
          <Link
            href="/mypage/reservations"
            className="text-sm text-damda-yellow-dark hover:text-damda-yellow-dark flex items-center"
          >
            전체보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBox
              icon={Clock}
              label="진행 중"
              value={reservationStats.pending + reservationStats.confirmed}
              color="text-blue-500"
              bgColor="bg-blue-50"
            />
            <StatBox
              icon={CheckCircle}
              label="완료"
              value={reservationStats.completed}
              color="text-green-500"
              bgColor="bg-green-50"
            />
            <StatBox
              icon={XCircle}
              label="취소/환불"
              value={reservationStats.cancelled}
              color="text-gray-500"
              bgColor="bg-gray-50"
            />
            <StatBox
              icon={FileText}
              label="전체"
              value={reservationStats.total}
              color="text-damda-yellow"
              bgColor="bg-damda-yellow-light"
            />
          </div>
        </CardContent>
      </Card>

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickMenuCard
          href="/mypage/wishlist"
          icon={Heart}
          label="찜 목록"
          count={wishlistCount}
          color="text-red-500"
          bgColor="bg-red-50"
        />
        <QuickMenuCard
          href="/mypage/reviews"
          icon={Star}
          label="내 리뷰"
          count={reviewCount}
          color="text-yellow-500"
          bgColor="bg-yellow-50"
        />
        <QuickMenuCard
          href="/mypage/inquiries"
          icon={MessageSquare}
          label="1:1 문의"
          count={inquiryCount}
          color="text-purple-500"
          bgColor="bg-purple-50"
        />
      </div>

      {/* 고객센터 안내 */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-gray-900">도움이 필요하신가요?</h3>
              <p className="text-sm text-gray-500">
                평일 09:00 - 18:00 (점심시간 12:00 - 13:00)
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/faq">자주 묻는 질문</Link>
              </Button>
              <Button className="bg-damda-yellow hover:bg-damda-yellow-dark" asChild>
                <Link href="/mypage/inquiries/new">1:1 문의하기</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`rounded-lg p-4 ${bgColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
    </div>
  );
}

function QuickMenuCard({
  href,
  icon: Icon,
  label,
  count,
  color,
  bgColor,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  bgColor: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center`}
          >
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-xl font-bold text-gray-900">{count}개</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </CardContent>
      </Card>
    </Link>
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

async function getInquiryCount(daycareId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("inquiries")
    .select("*", { count: "exact", head: true })
    .eq("daycare_id", daycareId);
  return count || 0;
}
