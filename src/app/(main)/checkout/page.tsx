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
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
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
  const { user, profile } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 예약자 정보
  const [reserverInfo, setReserverInfo] = useState({
    name: "",
    phone: "",
    email: "",
    daycareNam: "",
  });

  useEffect(() => {
    setMounted(true);
    // 장바구니가 비어있으면 장바구니로 리다이렉트
    if (items.length === 0) {
      router.replace("/cart");
    }
  }, [items.length, router]);

  if (!mounted) {
    return <CheckoutSkeleton />;
  }

  if (items.length === 0) {
    return null;
  }

  const totalAmount = getTotalAmount();

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
      // TODO: 실제 PG 연동 시 이 부분을 구현
      // 예시: 토스페이먼츠, 아임포트 등

      // 모의 결제 처리 (1.5초 대기)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 결제 성공 시 장바구니 비우기
      clearCart();

      // 결제 완료 페이지로 이동
      router.push("/checkout/complete?orderId=ORD" + Date.now());
    } catch {
      toast.error("결제 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/cart">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-gray-900">결제하기</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽: 결제 정보 입력 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 주문 상품 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">주문 상품</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-4">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image
                        src={item.product.thumbnail || "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&q=80"}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">{item.product.business_owner_name}</p>
                      <p className="font-medium text-gray-900 line-clamp-1">{item.product.name}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(item.reservationDate), "yyyy.MM.dd (EEE)", {
                            locale: ko,
                          })}
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
                        <p className="text-xs text-gray-500 mt-1">
                          {item.options.map((opt) => `${opt.name} x${opt.quantity}`).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">
                        {(
                          item.product.sale_price * item.participants +
                          (item.options?.reduce((sum, opt) => sum + opt.price * opt.quantity, 0) || 0)
                        ).toLocaleString()}
                        원
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 예약자 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">예약자 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">예약자명 *</Label>
                    <Input
                      id="name"
                      placeholder="홍길동"
                      value={reserverInfo.name}
                      onChange={(e) =>
                        setReserverInfo((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">연락처 *</Label>
                    <Input
                      id="phone"
                      placeholder="010-1234-5678"
                      value={reserverInfo.phone}
                      onChange={(e) =>
                        setReserverInfo((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={reserverInfo.email}
                      onChange={(e) =>
                        setReserverInfo((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="daycare">어린이집명</Label>
                    <Input
                      id="daycare"
                      placeholder="OO어린이집"
                      value={reserverInfo.daycareNam}
                      onChange={(e) =>
                        setReserverInfo((prev) => ({ ...prev, daycareNam: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 결제 수단 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">결제 수단</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="grid grid-cols-2 gap-4">
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                          paymentMethod === method.id
                            ? "border-damda-yellow bg-damda-yellow-light"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <RadioGroupItem value={method.id} />
                        <method.icon className="w-5 h-5 text-gray-600" />
                        <span className="font-medium">{method.name}</span>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* 오른쪽: 결제 금액 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 sticky top-[140px]">
              <h3 className="text-lg font-bold text-gray-900 mb-4">결제 금액</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">상품 금액</span>
                  <span className="font-medium">{totalAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>할인 금액</span>
                  <span>-0원</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-center mb-6">
                <span className="font-medium text-gray-900">총 결제 금액</span>
                <span className="text-2xl font-bold text-damda-yellow-dark">
                  {totalAmount.toLocaleString()}원
                </span>
              </div>

              {/* 약관 동의 */}
              <div className="mb-4">
                <label className="flex items-start gap-2 cursor-pointer">
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
              </div>

              <Button
                className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-lg"
                onClick={handlePayment}
                disabled={isProcessing || !agreedToTerms}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    결제 처리 중...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    {totalAmount.toLocaleString()}원 결제하기
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                안전한 결제를 위해 SSL 암호화를 사용합니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 h-48 animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 h-64 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
