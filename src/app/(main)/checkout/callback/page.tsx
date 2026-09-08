"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { clearCart as clearCartDB } from "@/services/cartService";
import { releaseAllUserHolds } from "@/services/holdService";

type PaymentStatus = "processing" | "success" | "error";

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart, clearDirectItem, setSelectedItemIds } = useCartStore();
  const [status, setStatus] = useState<PaymentStatus>("processing");
  const [message, setMessage] = useState("결제를 처리하고 있습니다...");
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reviewRequired, setReviewRequired] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    // 이미 처리된 경우 중복 실행 방지
    if (processedRef.current) return;
    processedRef.current = true;

    const processPayment = async () => {
      const authResultCode = searchParams.get("authResultCode");
      const authResultMsg = searchParams.get("authResultMsg");
      const tid = searchParams.get("tid");
      const orderId = searchParams.get("orderId");

      // 인증 실패 체크
      if (authResultCode === "REVIEW") {
        setReviewRequired(true);
        setStatus("error");
        setMessage("결제 확인 대기 중입니다. 다시 결제하지 말고 고객센터에 확인해주세요.");
        return;
      }
      if (authResultCode !== "0000") {
        // 홀드 해제
        await releaseAllUserHolds();
        localStorage.removeItem("damda_payment_holds");
        setStatus("error");
        setMessage(`결제 인증에 실패했습니다.\n[${authResultCode}] ${authResultMsg || "알 수 없는 오류"}`);
        return;
      }

      if (!tid || !orderId) {
        // 홀드 해제
        await releaseAllUserHolds();
        localStorage.removeItem("damda_payment_holds");
        setStatus("error");
        setMessage("결제 정보가 올바르지 않습니다.");
        return;
      }

      try {
        setMessage("결제를 승인하고 있습니다...");

        // 결제 승인 API 호출
        const approveResponse = await fetch("/api/payment/approve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tid,
            orderId,
          }),
        });

        const approveResult = await approveResponse.json();

        if (!approveResult.success) {
          setReviewRequired(Boolean(approveResult.reviewRequired || approveResult.paymentApproved));
          // PG 승인 이후 예약 확정에 실패한 경우에는 홀드를 풀지 않는다.
          // 결제 상태를 재조정하기 전 다른 사용자가 같은 재고를 예약하는 것을 방지한다.
          if (!approveResult.paymentApproved && !approveResult.reviewRequired) {
            await releaseAllUserHolds();
            localStorage.removeItem("damda_payment_holds");
          }
          setStatus("error");
          setMessage(approveResult.error || "결제 승인에 실패했습니다.");
          return;
        }

        // 장바구니 및 바로예약 아이템 비우기
        clearCart();
        clearDirectItem();
        setSelectedItemIds([]);
        await clearCartDB();

        // 홀드 해제 (결제 성공 시)
        await releaseAllUserHolds();

        // localStorage 정리
        localStorage.removeItem("damda_payment_holds");

        const reservationIds = approveResult.data?.reservationIds as string[] | undefined;
        setReservationId(reservationIds?.[0] || null);
        setStatus("success");
        setMessage("결제 및 예약이 완료되었습니다!");
      } catch {
        setReviewRequired(true);
        console.error("Payment response unavailable");
        setStatus("error");
        setMessage("결제 결과 확인 대기 중입니다. 다시 결제하지 말고 거래 재확인 또는 고객센터 확인을 기다려주세요.");
      }
    };

    processPayment();
  }, [searchParams, clearCart, clearDirectItem, setSelectedItemIds]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center px-4 max-w-md">
        {status === "processing" && (
          <>
            <Loader2 className="w-20 h-20 text-damda-yellow animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-3">결제 처리 중</h1>
            <p className="text-gray-500">{message}</p>
            <p className="text-sm text-gray-400 mt-4">잠시만 기다려주세요...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-3">결제 완료</h1>
            <p className="text-gray-600 mb-8">{message}</p>
            <div className="space-y-3">
              <Button
                className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900"
                onClick={() =>
                  router.push(
                    reservationId
                      ? `/mypage/reservations/${reservationId}`
                      : "/mypage/reservations"
                  )
                }
              >
                예약 상세 보기
              </Button>
              <Button
                variant="outline"
                className="w-full h-12"
                asChild
              >
                <Link href="/home">홈으로 돌아가기</Link>
              </Button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{reviewRequired ? "결제 확인 대기" : "결제 실패"}</h1>
            <p className="text-gray-600 whitespace-pre-line mb-8">{message}</p>
            <div className="space-y-3">
              <Button
                className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900"
                onClick={() => {
                  if (!reviewRequired) router.push("/checkout");
                  else if (searchParams.get("tid") && searchParams.get("orderId") && searchParams.get("authResultCode") === "0000") window.location.reload();
                  else router.push("/mypage/reservations");
                }}
              >
                {reviewRequired ? (searchParams.get("authResultCode") === "0000" ? "거래 상태 다시 확인" : "예약 내역 확인") : "다시 결제하기"}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12"
                asChild
              >
                <Link href="/cart">장바구니로 돌아가기</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center px-4">
        <Loader2 className="w-20 h-20 text-damda-yellow animate-spin mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-3">결제 처리 중</h1>
        <p className="text-gray-500">결제를 처리하고 있습니다...</p>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
