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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { type CartItem } from "@/stores/cart-store";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateItem, clearCart, getTotalAmount, isSyncing } = useCart();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // 클라이언트 사이드 hydration
  useEffect(() => {
    setMounted(true);
    // 모든 아이템 기본 선택
    setSelectedIds(new Set(items.map((item) => item.product.id)));
  }, [items]);

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

  // 선택 상품 총액
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

  // 결제 페이지로
  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      toast.error("결제할 상품을 선택해주세요.");
      return;
    }
    router.push("/checkout");
  };

  if (items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">장바구니</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 장바구니 목록 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 전체 선택 */}
            <div className="bg-white rounded-xl p-4 flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={selectedIds.size === items.length && items.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">
                  전체 선택 ({selectedIds.size}/{items.length})
                </span>
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className="text-gray-500 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                선택 삭제
              </Button>
            </div>

            {/* 아이템 목록 */}
            {items.map((item) => (
              <CartItemCard
                key={item.product.id}
                item={item}
                isSelected={selectedIds.has(item.product.id)}
                onSelect={() => toggleSelect(item.product.id)}
                onDelete={() => handleDeleteItem(item.product.id)}
                onParticipantsChange={(delta) =>
                  handleParticipantsChange(item.product.id, delta)
                }
              />
            ))}
          </div>

          {/* 결제 정보 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 sticky top-[140px]">
              <h3 className="text-lg font-bold text-gray-900 mb-4">결제 정보</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">선택 상품 수</span>
                  <span className="font-medium">{selectedItems.length}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">상품 금액</span>
                  <span className="font-medium">
                    {getSelectedTotalAmount().toLocaleString()}원
                  </span>
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
                  {getSelectedTotalAmount().toLocaleString()}원
                </span>
              </div>

              <Button
                className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-lg"
                onClick={handleCheckout}
                disabled={selectedItems.length === 0}
              >
                결제하기
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                선택하신 상품만 결제됩니다
              </p>
            </div>
          </div>
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
}

function CartItemCard({
  item,
  isSelected,
  onSelect,
  onDelete,
  onParticipantsChange,
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

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6">
      <div className="flex gap-4">
        {/* 체크박스 */}
        <div className="flex items-start pt-1">
          <Checkbox checked={isSelected} onCheckedChange={onSelect} />
        </div>

        {/* 이미지 */}
        <Link
          href={`/products/${item.product.id}`}
          className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
        >
          <Image
            src={item.product.thumbnail || "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&q=80"}
            alt={item.product.name}
            fill
            className="object-cover"
            sizes="128px"
          />
        </Link>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500">{item.product.business_owner_name}</p>
              <Link
                href={`/products/${item.product.id}`}
                className="font-medium text-gray-900 hover:text-damda-yellow-dark line-clamp-2"
              >
                {item.product.name}
              </Link>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-red-500 -mr-2"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* 예약 정보 */}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
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

          {/* 옵션 */}
          {item.options && item.options.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              {item.options.map((opt) => (
                <span key={opt.id} className="mr-2">
                  {opt.name} x{opt.quantity}
                </span>
              ))}
            </div>
          )}

          {/* 인원 변경 & 가격 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center border rounded-lg">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onParticipantsChange(-1)}
                disabled={item.participants <= 1}
                className="h-8 w-8"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-10 text-center text-sm">{item.participants}명</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onParticipantsChange(1)}
                className="h-8 w-8"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            <div className="text-right">
              <span className="text-lg font-bold text-gray-900">
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">장바구니</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            장바구니가 비어있습니다
          </h2>
          <p className="text-gray-500 mb-8">
            원하시는 체험 상품을 담아보세요
          </p>
          <Button asChild className="bg-damda-yellow hover:bg-damda-yellow-dark">
            <Link href="/products">
              상품 둘러보기
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6">
                <div className="flex gap-4">
                  <div className="w-32 h-32 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
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
