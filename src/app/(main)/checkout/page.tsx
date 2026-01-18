"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  CreditCard,
  Building2,
  ChevronLeft,
  Lock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useCartStore } from "@/stores/cart-store";
import { useAuth } from "@/hooks/use-auth";
import { checkCartAvailability, createReservations, clearCart as clearCartDB, type UnavailableItem } from "@/services/cartService";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

const PAYMENT_METHODS = [
  { id: "card", name: "신용/체크카드", icon: CreditCard },
  { id: "bank", name: "계좌이체", icon: Building2 },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalAmount, clearCart } = useCartStore();
  const { user, profile } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);

  // 예약자 정보
  const [reserverInfo, setReserverInfo] = useState({
    name: "",
    phone: "",
    email: "",
    daycareName: "",
  });

  // 회원 정보로 자동 채우기
  useEffect(() => {
    const fillUserInfo = async () => {
      if (!user) return;

      // 기본 회원 정보 채우기
      setReserverInfo((prev) => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phone || prev.phone,
        email: user.email || prev.email,
      }));

      // 어린이집 정보 조회 및 채우기
      if (profile?.daycareId) {
        const supabase = createClient();
        const { data: daycare } = await supabase
          .from("daycares")
          .select("name")
          .eq("id", profile.daycareId)
          .single();

        if (daycare?.name) {
          setReserverInfo((prev) => ({
            ...prev,
            daycareName: daycare.name,
          }));
        }
      }
    };

    fillUserInfo();
  }, [user, profile?.daycareId]);

  useEffect(() => {
    setMounted(true);
    // 장바구니가 비어있으면 장바구니로 리다이렉트 (결제 완료 시에는 제외)
    if (items.length === 0 && !isPaymentComplete) {
      router.replace("/cart");
    }
  }, [items.length, router, isPaymentComplete]);

  if (!mounted) {
    return <CheckoutSkeleton />;
  }

  if (items.length === 0) {
    return null;
  }

  const totalAmount = getTotalAmount();

  // 정가 총액 계산
  const getOriginalAmount = () => {
    return items.reduce((total, item) => {
      let itemTotal = item.product.original_price * item.participants;
      if (item.options) {
        item.options.forEach((opt) => {
          itemTotal += opt.price * opt.quantity;
        });
      }
      return total + itemTotal;
    }, 0);
  };

  const originalAmount = getOriginalAmount();
  const discountAmount = originalAmount - totalAmount;

  // 예약 불가 사유 메시지
  const getUnavailableReason = (reason: UnavailableItem["reason"]) => {
    switch (reason) {
      case "sold_out":
        return "품절된 상품입니다.";
      case "time_passed":
        return "예약 시간이 지났습니다.";
      case "fully_booked":
        return "해당 시간대가 마감되었습니다.";
      default:
        return "예약이 불가능합니다.";
    }
  };

  // 결제 처리 (모의)
  const handlePayment = async () => {
    if (!agreedToTerms) {
      toast.error("결제 약관에 동의해주세요.");
      return;
    }

    if (!reserverInfo.name || !reserverInfo.phone) {
      toast.error("예약자 정보를 입력해주세요.");
      return;
    }

    setIsProcessing(true);

    try {
      // 예약 가능 여부 확인
      const unavailableItems = await checkCartAvailability(
        items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          reservedDate: item.reservationDate,
          reservedTime: item.reservationTime,
          participants: item.participants,
        }))
      );

      if (unavailableItems.length > 0) {
        const item = unavailableItems[0];
        toast.error(
          `"${item.productName}" - ${getUnavailableReason(item.reason)} 장바구니에서 해당 상품을 수정하거나 삭제해주세요.`,
          { duration: 5000 }
        );
        setIsProcessing(false);
        return;
      }

      // TODO: 실제 PG 연동 시 이 부분을 구현
      // 예시: 토스페이먼츠, 아임포트 등

      // 모의 결제 처리 (1.5초 대기)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 예약 생성
      const reservationItems = items.map((item) => {
        let itemTotal = item.product.sale_price * item.participants;
        if (item.options) {
          item.options.forEach((opt) => {
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
      });

      if (!result.success) {
        toast.error(result.error || "예약 생성에 실패했습니다.");
        setIsProcessing(false);
        return;
      }

      // 결제 완료 표시 (장바구니 리다이렉트 방지)
      setIsPaymentComplete(true);

      // 결제 성공 시 장바구니 비우기 (로컬 스토어 + DB)
      clearCart();
      await clearCartDB();

      // 결제 완료 페이지로 이동
      router.push("/checkout/complete?orderId=" + result.orderId);
    } catch {
      toast.error("결제 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="px-4 py-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Link href="/cart" className="text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">결제하기</h1>
          </div>
        </div>

        {/* 주문 상품 */}
        <section className="border-b border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">주문 상품</h2>
          </div>
          {items.map((item, index) => {
            const itemTotal =
              item.product.sale_price * item.participants +
              (item.options?.reduce((sum, opt) => sum + opt.price * opt.quantity, 0) || 0);
            const discountRate = item.product.original_price > 0
              ? Math.round(((item.product.original_price - item.product.sale_price) / item.product.original_price) * 100)
              : 0;

            return (
              <div
                key={item.product.id}
                className={`px-4 py-4 ${index !== items.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                <div className="flex gap-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={item.product.thumbnail || "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&q=80"}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{item.product.business_owner_name}</p>
                    <p className="font-medium text-gray-900 text-sm line-clamp-1">{item.product.name}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(item.reservationDate), "M.d (E)", { locale: ko })}
                      </span>
                      {item.reservationTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.reservationTime}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {item.participants}명
                      </span>
                    </div>
                    {item.options && item.options.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {item.options.map((opt) => `${opt.name} x${opt.quantity}`).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {discountRate > 0 && (
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs font-bold text-red-500">{discountRate}%</span>
                        <span className="text-xs text-gray-400 line-through">
                          {(item.product.original_price * item.participants).toLocaleString()}원
                        </span>
                      </div>
                    )}
                    <span className="font-bold text-gray-900 text-sm">
                      {itemTotal.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* 예약자 정보 */}
        <section className="border-b border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">예약자 정보</h2>
          </div>
          <div className="px-4 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm text-gray-600">예약자명 *</Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  value={reserverInfo.name}
                  onChange={(e) =>
                    setReserverInfo((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm text-gray-600">연락처 *</Label>
                <Input
                  id="phone"
                  placeholder="010-1234-5678"
                  value={reserverInfo.phone}
                  onChange={(e) =>
                    setReserverInfo((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="mt-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email" className="text-sm text-gray-600">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={reserverInfo.email}
                  onChange={(e) =>
                    setReserverInfo((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="mt-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="daycare" className="text-sm text-gray-600">어린이집명</Label>
                <Input
                  id="daycare"
                  placeholder="OO어린이집"
                  value={reserverInfo.daycareName}
                  onChange={(e) =>
                    setReserverInfo((prev) => ({ ...prev, daycareName: e.target.value }))
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 결제 수단 */}
        <section className="border-b border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">결제 수단</h2>
          </div>
          <div className="px-4 py-4">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-2.5 p-3 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === method.id
                        ? "border-damda-yellow bg-damda-yellow-light/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value={method.id} />
                    <method.icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">{method.name}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>
        </section>

        {/* 결제 금액 */}
        <section className="border-b border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">결제 금액</h2>
          </div>
          <div className="px-4 py-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">상품 금액</span>
                <span className="font-medium text-gray-900">{originalAmount.toLocaleString()}원</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>할인 금액</span>
                  <span>-{discountAmount.toLocaleString()}원</span>
                </div>
              )}
            </div>

            <div className="h-px bg-gray-200 my-4" />

            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">총 결제 금액</span>
              <span className="text-2xl font-bold text-damda-yellow-dark">
                {totalAmount.toLocaleString()}원
              </span>
            </div>
          </div>
        </section>

        {/* 약관 동의 & 결제 버튼 */}
        <div className="px-4 py-6">
          <label className="flex items-start gap-2 cursor-pointer mb-4">
            <Checkbox
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-0.5"
            />
            <span className="text-sm text-gray-600">
              결제 및 환불 정책에 동의합니다.{" "}
              <Link href="#" className="text-damda-yellow-dark underline">
                약관 보기
              </Link>
            </span>
          </label>

          <Button
            className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900 text-lg font-medium"
            onClick={handlePayment}
            disabled={isProcessing || !agreedToTerms}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2" />
                결제 처리 중...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                {totalAmount.toLocaleString()}원 결제하기
              </>
            )}
          </Button>

          <p className="text-xs text-gray-400 text-center mt-3">
            안전한 결제를 위해 SSL 암호화를 사용합니다
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="px-4 py-6 border-b border-gray-200">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="px-4 py-4 border-b border-gray-100">
            <div className="flex gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
        <div className="px-4 py-4 border-b border-gray-200 space-y-4">
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="px-4 py-6">
          <div className="h-12 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
