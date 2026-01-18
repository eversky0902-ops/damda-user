"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Calendar, FileText, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        {/* 성공 아이콘 */}
        <div className="px-4 py-12 text-center border-b border-gray-200">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            예약이 완료되었습니다!
          </h1>
          <p className="text-sm text-gray-500">
            결제가 정상적으로 처리되었습니다.
          </p>
        </div>

        {/* 주문 정보 */}
        <section className="border-b border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">주문 정보</h2>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">주문번호</span>
              <span className="font-mono text-sm font-medium text-gray-900">
                {orderId || "ORD" + Date.now()}
              </span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">예약 상태</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                예약 확정
              </span>
            </div>
          </div>
        </section>

        {/* 예약 안내 */}
        <section className="border-b border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-damda-yellow" />
              예약 안내
            </h2>
          </div>
          <div className="px-4 py-4">
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-damda-yellow mt-0.5">•</span>
                <span>체험 장소 및 준비물은 마이페이지에서 확인하실 수 있습니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-damda-yellow mt-0.5">•</span>
                <span>예약 변경 및 취소는 체험일 3일 전까지 가능합니다.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 버튼들 */}
        <div className="px-4 py-6 space-y-3">
          <Button
            asChild
            className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900 font-medium"
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
        <div className="px-4 pb-8 text-center">
          <p className="text-xs text-gray-400 mb-1">
            문의사항이 있으신가요?
          </p>
          <Link
            href="/faq"
            className="text-sm text-damda-yellow-dark hover:underline inline-flex items-center gap-1"
          >
            고객센터 바로가기
            <ArrowRight className="w-3 h-3" />
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
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="px-4 py-12 text-center border-b border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-48 bg-gray-100 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 rounded mx-auto animate-pulse" />
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="px-4 py-4 border-b border-gray-200 space-y-3">
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="h-5 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="px-4 py-4 border-b border-gray-200 space-y-2">
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="px-4 py-6 space-y-3">
          <div className="h-12 bg-gray-100 rounded animate-pulse" />
          <div className="h-12 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
