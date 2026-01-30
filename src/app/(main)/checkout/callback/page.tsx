"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { createReservations, clearCart as clearCartDB } from "@/services/cartService";

type PaymentStatus = "processing" | "success" | "error";

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, clearCart, clearDirectItem } = useCartStore();
  const [status, setStatus] = useState<PaymentStatus>("processing");
  const [message, setMessage] = useState("결제를 처리하고 있습니다...");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    // 이미 처리된 경우 중복 실행 방지
    if (processedRef.current) return;
    processedRef.current = true;

    const processPayment = async () => {
      const authResultCode = searchParams.get("authResultCode");
      const authResultMsg = searchParams.get("authResultMsg");
      const tid = searchParams.get("tid");

      // 인증 실패 체크
      if (authResultCode !== "0000") {
        setStatus("error");
        setMessage(`결제 인증에 실패했습니다.\n[${authResultCode}] ${authResultMsg || "알 수 없는 오류"}`);
        return;
      }

      if (!tid) {
        setStatus("error");
        setMessage("결제 정보가 올바르지 않습니다. (tid 없음)");
        return;
      }

      // localStorage에서 결제 금액 계산
      const storedCartItems = localStorage.getItem("damda_checkout_items");
      if (!storedCartItems) {
        setStatus("error");
        setMessage("장바구니 정보를 찾을 수 없습니다.");
        return;
      }

      const cartItems = JSON.parse(storedCartItems);
      const amount = cartItems.reduce((total: number, item: typeof items[0]) => {
        let itemTotal = item.product.sale_price * item.participants;
        if (item.options) {
          item.options.forEach((opt: { price: number; quantity: number }) => {
            itemTotal += opt.price * opt.quantity;
          });
        }
        return total + itemTotal;
      }, 0);

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
            amount: amount,
          }),
        });

        const approveResult = await approveResponse.json();

        if (!approveResult.success) {
          setStatus("error");
          setMessage(approveResult.error || "결제 승인에 실패했습니다.");
          return;
        }

        setMessage("예약을 생성하고 있습니다...");

        // localStorage에서 예약 정보 가져오기
        const storedReserverInfo = localStorage.getItem("damda_reserver_info");
        const storedPaymentMethod = localStorage.getItem("damda_payment_method");

        const reserverInfo = storedReserverInfo
          ? JSON.parse(storedReserverInfo)
          : { name: "", phone: "", email: "" };
        const paymentMethod = storedPaymentMethod || "card";

        // 예약 생성
        const reservationItems = cartItems.map((item: typeof items[0]) => {
          let itemTotal = item.product.sale_price * item.participants;
          if (item.options) {
            item.options.forEach((opt: { price: number; quantity: number }) => {
              itemTotal += opt.price * opt.quantity;
            });
          }
          return {
            productId: item.product.id,
            reservedDate: item.reservationDate,
            reservedTime: item.reservationTime,
            participants: item.participants,
            options: item.options,
            totalAmount: itemTotal,
          };
        });

        const result = await createReservations({
          items: reservationItems,
          reserverInfo: {
            name: reserverInfo.name,
            phone: reserverInfo.phone,
            email: reserverInfo.email || undefined,
            daycareName: reserverInfo.daycareName || undefined,
          },
          paymentMethod,
          paymentTid: tid,
        });

        if (!result.success) {
          setStatus("error");
          setMessage(result.error || "예약 생성에 실패했습니다.");
          // TODO: 결제 취소 API 호출 필요
          return;
        }

        // 장바구니 및 바로예약 아이템 비우기
        clearCart();
        clearDirectItem();
        await clearCartDB();

        // localStorage 정리
        localStorage.removeItem("damda_reserver_info");
        localStorage.removeItem("damda_payment_method");
        localStorage.removeItem("damda_checkout_items");

        setOrderId(result.orderId || null);
        setReservationId(result.reservationId || null);
        setStatus("success");
        setMessage("결제 및 예약이 완료되었습니다!");
      } catch (error) {
        console.error("Payment processing error:", error);
        setStatus("error");
        setMessage("결제 처리 중 오류가 발생했습니다.");
      }
    };

    processPayment();
  }, [searchParams, items, clearCart, clearDirectItem]);

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
            <h1 className="text-2xl font-bold text-gray-900 mb-3">결제 실패</h1>
            <p className="text-gray-600 whitespace-pre-line mb-8">{message}</p>
            <div className="space-y-3">
              <Button
                className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900"
                onClick={() => router.push("/checkout")}
              >
                다시 결제하기
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
