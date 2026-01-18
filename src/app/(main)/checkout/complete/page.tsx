"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Calendar, FileText, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function CheckoutCompleteContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <CompleteSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* 성공 아이콘 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            예약이 완료되었습니다!
          </h1>
          <p className="text-gray-600">
            결제가 정상적으로 처리되었습니다.
          </p>
        </div>

        {/* 주문 정보 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">주문번호</span>
                <span className="font-mono font-medium text-gray-900">
                  {orderId || "ORD" + Date.now()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">예약 상태</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-damda-yellow-light text-damda-yellow-dark">
                  예약 확정 대기중
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 안내 메시지 */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-damda-yellow" />
              예약 안내
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-damda-yellow">•</span>
                예약 확정 후 등록하신 연락처로 안내 문자가 발송됩니다.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-damda-yellow">•</span>
                체험 장소 및 준비물은 마이페이지에서 확인하실 수 있습니다.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-damda-yellow">•</span>
                예약 변경 및 취소는 체험일 3일 전까지 가능합니다.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 버튼들 */}
        <div className="space-y-3">
          <Button
            asChild
            className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark"
          >
            <Link href="/mypage/reservations">
              <FileText className="w-5 h-5 mr-2" />
              예약 내역 확인하기
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full h-12"
          >
            <Link href="/home">
              <Home className="w-5 h-5 mr-2" />
              홈으로 돌아가기
            </Link>
          </Button>
        </div>

        {/* 추가 안내 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-2">
            문의사항이 있으신가요?
          </p>
          <Link
            href="/support"
            className="text-damda-yellow-dark hover:text-damda-yellow-dark text-sm font-medium inline-flex items-center gap-1"
          >
            고객센터 바로가기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<CompleteSkeleton />}>
      <CheckoutCompleteContent />
    </Suspense>
  );
}

function CompleteSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-6 animate-pulse" />
          <div className="h-8 w-64 bg-gray-200 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-5 w-48 bg-gray-200 rounded mx-auto animate-pulse" />
        </div>
        <div className="bg-white rounded-xl p-6 h-32 animate-pulse mb-6" />
        <div className="bg-white rounded-xl p-6 h-40 animate-pulse mb-8" />
        <div className="space-y-3">
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
