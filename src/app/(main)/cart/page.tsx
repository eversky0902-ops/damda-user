"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingCart,
  ChevronRight,
  Calendar,
  Clock,
  Users,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/hooks/use-cart";
import { type CartItem } from "@/stores/cart-store";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateItem, clearCart, clearDirectItem, getTotalAmount, isSyncing } = useCart();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // 클라이언트 사이드 hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // 아이템 변경 시 선택 상태 동기화 (새 아이템 추가 시 선택, 삭제된 아이템 제거)
  useEffect(() => {
    if (!mounted) return;

    setSelectedIds((prev) => {
      const currentIds = new Set(items.map((item) => item.product.id));
      const next = new Set<string>();

      // 기존 선택 중 아직 존재하는 아이템만 유지
      prev.forEach((id) => {
        if (currentIds.has(id)) {
          next.add(id);
        }
      });

      // 새로 추가된 아이템은 자동 선택
      items.forEach((item) => {
        if (!prev.has(item.product.id) && prev.size === 0) {
          // 처음 로드 시에만 전체 선택
          next.add(item.product.id);
        }
      });

      // 처음 로드 시 전체 선택
      if (prev.size === 0 && items.length > 0) {
        items.forEach((item) => next.add(item.product.id));
      }

      return next;
    });
  }, [items, mounted]);

  if (!mounted || isSyncing) {
    return <CartSkeleton />;
  }

  // 선택된 아이템들
  const selectedItems = items.filter((item) => selectedIds.has(item.product.id));

  // 선택 토글
  const toggleSelect = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.product.id)));
    }
  };

  // 선택 삭제
  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedIds);
    for (const id of idsToDelete) {
      await removeItem(id);
    }
    setSelectedIds(new Set());
    toast.success("선택한 상품을 삭제했습니다.");
  };

  // 개별 삭제
  const handleDeleteItem = async (productId: string) => {
    await removeItem(productId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    toast.success("상품을 삭제했습니다.");
  };

  // 인원 변경
  const handleParticipantsChange = async (productId: string, delta: number) => {
    const item = items.find((i) => i.product.id === productId);
    if (item) {
      const newParticipants = Math.max(1, item.participants + delta);
      await updateItem(productId, { participants: newParticipants });
    }
  };

  // 선택 상품 정가 총액 (할인 전)
  const getSelectedOriginalAmount = () => {
    return selectedItems.reduce((total, item) => {
      let itemTotal = item.product.original_price * item.participants;
      if (item.options) {
        item.options.forEach((opt) => {
          itemTotal += opt.price * opt.quantity;
        });
      }
      return total + itemTotal;
    }, 0);
  };

  // 선택 상품 할인가 총액
  const getSelectedTotalAmount = () => {
    return selectedItems.reduce((total, item) => {
      let itemTotal = item.product.sale_price * item.participants;
      if (item.options) {
        item.options.forEach((opt) => {
          itemTotal += opt.price * opt.quantity;
        });
      }
      return total + itemTotal;
    }, 0);
  };

  // 총 할인 금액
  const getTotalDiscount = () => {
    return getSelectedOriginalAmount() - getSelectedTotalAmount();
  };

  // 결제 페이지로
  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      toast.error("결제할 상품을 선택해주세요.");
      return;
    }
    // 바로예약 아이템이 있으면 클리어 (장바구니에서 결제하는 것이므로)
    clearDirectItem();
    router.push("/checkout");
  };

  if (items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="px-4 py-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">장바구니</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length}개의 상품이 담겨있습니다.</p>
        </div>

        {/* 전체 선택 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={selectedIds.size === items.length && items.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm font-medium text-gray-700">
              전체 선택 ({selectedIds.size}/{items.length})
            </span>
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            className="text-gray-500 hover:text-red-500 h-8 px-2"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            선택 삭제
          </Button>
        </div>

        {/* 아이템 목록 */}
        <div className="border-b border-gray-200">
          {items.map((item, index) => (
            <CartItemCard
              key={item.product.id}
              item={item}
              isSelected={selectedIds.has(item.product.id)}
              onSelect={() => toggleSelect(item.product.id)}
              onDelete={() => handleDeleteItem(item.product.id)}
              onParticipantsChange={(delta) =>
                handleParticipantsChange(item.product.id, delta)
              }
              isLast={index === items.length - 1}
            />
          ))}
        </div>

        {/* 결제 정보 */}
        <div className="px-4 py-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">결제 정보</h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">선택 상품 수</span>
              <span className="font-medium text-gray-900">{selectedItems.length}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">상품 금액</span>
              <span className="font-medium text-gray-900">
                {getSelectedOriginalAmount().toLocaleString()}원
              </span>
            </div>
            {getTotalDiscount() > 0 && (
              <div className="flex justify-between text-red-500">
                <span>할인 금액</span>
                <span>-{getTotalDiscount().toLocaleString()}원</span>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-200 my-4" />

          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-900">총 결제 금액</span>
            <span className="text-2xl font-bold text-damda-yellow-dark">
              {getSelectedTotalAmount().toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 결제 버튼 */}
        <div className="px-4 py-6">
          <Button
            className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900 text-lg font-medium"
            onClick={handleCheckout}
            disabled={selectedItems.length === 0}
          >
            결제하기
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="text-xs text-gray-400 text-center mt-3">
            선택하신 상품만 결제됩니다
          </p>
        </div>
      </div>
    </div>
  );
}

interface CartItemCardProps {
  item: CartItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onParticipantsChange: (delta: number) => void;
  isLast: boolean;
}

function CartItemCard({
  item,
  isSelected,
  onSelect,
  onDelete,
  onParticipantsChange,
  isLast,
}: CartItemCardProps) {
  const itemTotal = (() => {
    let total = item.product.sale_price * item.participants;
    if (item.options) {
      item.options.forEach((opt) => {
        total += opt.price * opt.quantity;
      });
    }
    return total;
  })();

  const discountRate = item.product.original_price > 0
    ? Math.round(((item.product.original_price - item.product.sale_price) / item.product.original_price) * 100)
    : 0;

  // 예약 시간이 지났는지 확인
  const isExpired = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reservedDate = new Date(item.reservationDate);
    reservedDate.setHours(0, 0, 0, 0);

    // 날짜가 지난 경우
    if (reservedDate < today) return true;

    // 오늘인데 시간이 지난 경우
    if (reservedDate.getTime() === today.getTime() && item.reservationTime) {
      const [hours, minutes] = item.reservationTime.split(":").map(Number);
      const now = new Date();
      if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)) {
        return true;
      }
    }

    return false;
  })();

  return (
    <div className={`px-4 py-4 ${!isLast ? "border-b border-gray-100" : ""} ${isExpired ? "bg-red-50" : ""}`}>
      {isExpired && (
        <div className="flex items-center gap-2 text-xs text-red-600 mb-3 pb-2 border-b border-red-200">
          <AlertCircle className="w-4 h-4" />
          <span>예약 시간이 지났습니다. 날짜/시간을 변경하거나 삭제해주세요.</span>
        </div>
      )}
      <div className="flex gap-3">
        {/* 체크박스 */}
        <div className="flex items-start pt-1">
          <Checkbox checked={isSelected} onCheckedChange={onSelect} disabled={isExpired} />
        </div>

        {/* 이미지 */}
        <Link
          href={`/products/${item.product.id}`}
          className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
        >
          <Image
            src={item.product.thumbnail || "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&q=80"}
            alt={item.product.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        </Link>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{item.product.business_owner_name}</p>
              <Link
                href={`/products/${item.product.id}`}
                className="font-medium text-gray-900 hover:text-damda-yellow-dark line-clamp-1 text-sm"
              >
                {item.product.name}
              </Link>
            </div>
            <button
              onClick={onDelete}
              className="text-gray-300 hover:text-red-500 p-1 -mr-1 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* 예약 정보 */}
          <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(parseISO(item.reservationDate), "M.d (E)", {
                locale: ko,
              })}
            </span>
            {item.reservationTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {item.reservationTime}
              </span>
            )}
          </div>

          {/* 옵션 */}
          {item.options && item.options.length > 0 && (
            <div className="mt-1 text-xs text-gray-400">
              {item.options.map((opt) => (
                <span key={opt.id} className="mr-2">
                  {opt.name} x{opt.quantity}
                </span>
              ))}
            </div>
          )}

          {/* 인원 변경 & 가격 */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => onParticipantsChange(-1)}
                disabled={item.participants <= 1}
                className="h-7 w-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 text-center text-xs font-medium text-gray-700">{item.participants}명</span>
              <button
                type="button"
                onClick={() => onParticipantsChange(1)}
                className="h-7 w-7 flex items-center justify-center text-gray-500 hover:bg-gray-50"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="text-right">
              {discountRate > 0 && (
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-xs font-bold text-red-500">{discountRate}%</span>
                  <span className="text-xs text-gray-400 line-through">
                    {(item.product.original_price * item.participants).toLocaleString()}원
                  </span>
                </div>
              )}
              <span className="text-base font-bold text-gray-900">
                {itemTotal.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="px-4 py-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">장바구니</h1>
        </div>

        <div className="px-4 py-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-1">
            장바구니가 비어있습니다
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            원하시는 체험 상품을 담아보세요
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-damda-yellow hover:text-damda-yellow-dark"
          >
            상품 둘러보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="px-4 py-6 border-b border-gray-200">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="px-4 py-4 border-b border-gray-100">
            <div className="flex gap-3">
              <div className="w-5 h-5 bg-gray-100 rounded animate-pulse" />
              <div className="w-20 h-20 bg-gray-100 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
