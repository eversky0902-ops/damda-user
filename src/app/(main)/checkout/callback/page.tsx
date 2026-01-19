"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { createReservations, clearCart as clearCartDB } from "@/services/cartService";
import { toast } from "sonner";

type PaymentStatus = "processing" | "success" | "error";

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, clearCart } = useCartStore();
  const [status, setStatus] = useState<PaymentStatus>("processing");
  const [message, setMessage] = useState("결제를 처리하고 있습니다...");

  useEffect(() => {
    const processPayment = async () => {
      const authResultCode = searchParams.get("authResultCode");
      const authResultMsg = searchParams.get("authResultMsg");
      const tid = searchParams.get("tid");
      const amount = searchParams.get("amount");

      // 인증 실패 체크
      if (authResultCode !== "0000") {
        setStatus("error");
        setMessage(authResultMsg || "결제 인증에 실패했습니다.");
        setTimeout(() => {
          router.replace("/checkout");
        }, 3000);
        return;
      }

      if (!tid || !amount) {
        setStatus("error");
        setMessage("결제 정보가 올바르지 않습니다.");
        setTimeout(() => {
          router.replace("/checkout");
        }, 3000);
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
            amount: parseInt(amount),
          }),
        });

        const approveResult = await approveResponse.json();

        if (!approveResult.success) {
          setStatus("error");
          setMessage(approveResult.error || "결제 승인에 실패했습니다.");
          setTimeout(() => {
            router.replace("/checkout");
          }, 3000);
          return;
        }

        setMessage("예약을 생성하고 있습니다...");

        // localStorage에서 예약 정보 가져오기
        const storedReserverInfo = localStorage.getItem("damda_reserver_info");
        const storedPaymentMethod = localStorage.getItem("damda_payment_method");
        const storedCartItems = localStorage.getItem("damda_checkout_items");

        const reserverInfo = storedReserverInfo
          ? JSON.parse(storedReserverInfo)
          : { name: "", phone: "", email: "" };
        const paymentMethod = storedPaymentMethod || "card";
        const cartItems = storedCartItems ? JSON.parse(storedCartItems) : items;

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
          setTimeout(() => {
            router.replace("/checkout");
          }, 3000);
          return;
        }

        // 장바구니 비우기
        clearCart();
        await clearCartDB();

        // localStorage 정리
        localStorage.removeItem("damda_reserver_info");
        localStorage.removeItem("damda_payment_method");
        localStorage.removeItem("damda_checkout_items");

        setStatus("success");
        setMessage("결제가 완료되었습니다!");

        // 결제 완료 페이지로 이동
        setTimeout(() => {
          router.replace("/checkout/complete?orderId=" + result.orderId);
        }, 1500);
      } catch (error) {
        console.error("Payment processing error:", error);
        setStatus("error");
        setMessage("결제 처리 중 오류가 발생했습니다.");
        toast.error("결제 처리 중 오류가 발생했습니다.");
        setTimeout(() => {
          router.replace("/checkout");
        }, 3000);
      }
    };

    processPayment();
  }, [searchParams, router, items, clearCart]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center px-4">
        {status === "processing" && (
          <>
            <Loader2 className="w-16 h-16 text-damda-yellow animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">결제 처리 중</h1>
            <p className="text-gray-500">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">결제 완료</h1>
            <p className="text-gray-500">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">결제 실패</h1>
            <p className="text-gray-500">{message}</p>
            <p className="text-sm text-gray-400 mt-2">잠시 후 결제 페이지로 이동합니다...</p>
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
        <Loader2 className="w-16 h-16 text-damda-yellow animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">결제 처리 중</h1>
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
