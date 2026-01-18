"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2, ShoppingCart, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  getWishlist,
  removeFromWishlist,
  type WishlistItem,
} from "@/services/wishlistService";
import { useAuth } from "@/hooks/use-auth";

export default function WishlistPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getWishlist();
      setWishlist(data);
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
      toast.error("찜 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchWishlist();
    }
  }, [authLoading, fetchWishlist]);

  if (authLoading || isLoading) {
    return <WishlistSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-gray-900">찜 목록</h1>
        <div className="text-center py-16 bg-white rounded-xl">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            로그인이 필요합니다
          </h3>
          <p className="text-gray-500 mb-6">
            찜 목록을 확인하려면 로그인해주세요.
          </p>
          <Button asChild className="bg-damda-yellow hover:bg-damda-yellow-dark">
            <Link href="/login">로그인하기</Link>
          </Button>
        </div>
      </div>
    );
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === wishlist.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(wishlist.map((item) => item.id)));
    }
  };

  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedIds);
    setDeletingIds(new Set(idsToDelete));

    try {
      const results = await Promise.all(
        idsToDelete.map((id) => {
          const item = wishlist.find((w) => w.id === id);
          return item ? removeFromWishlist(item.product_id) : Promise.resolve(false);
        })
      );

      const successCount = results.filter(Boolean).length;
      if (successCount > 0) {
        setWishlist((prev) =>
          prev.filter((item) => !selectedIds.has(item.id))
        );
        setSelectedIds(new Set());
        toast.success(`${successCount}개 상품을 삭제했습니다.`);
      }
    } catch (error) {
      console.error("Failed to delete items:", error);
      toast.error("삭제에 실패했습니다.");
    } finally {
      setDeletingIds(new Set());
    }
  };

  const handleDelete = async (id: string, productId: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));

    try {
      const success = await removeFromWishlist(productId);
      if (success) {
        setWishlist((prev) => prev.filter((item) => item.id !== id));
        selectedIds.delete(id);
        setSelectedIds(new Set(selectedIds));
        toast.success("찜 목록에서 삭제했습니다.");
      } else {
        toast.error("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast.error("삭제에 실패했습니다.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (wishlist.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">찜 목록</h1>
        <span className="text-sm text-gray-500">{wishlist.length}개</span>
      </div>

      {/* 전체 선택 */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={selectedIds.size === wishlist.length && wishlist.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm font-medium">
            전체 선택 ({selectedIds.size}/{wishlist.length})
          </span>
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteSelected}
          disabled={selectedIds.size === 0 || deletingIds.size > 0}
          className="text-gray-500 hover:text-red-500"
        >
          {deletingIds.size > 0 ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-1" />
          )}
          선택 삭제
        </Button>
      </div>

      {/* 찜 목록 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {wishlist.map((item) => (
          <WishlistCard
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            isDeleting={deletingIds.has(item.id)}
            onSelect={() => toggleSelect(item.id)}
            onDelete={() => handleDelete(item.id, item.product_id)}
          />
        ))}
      </div>
    </div>
  );
}

interface WishlistCardProps {
  item: WishlistItem;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function WishlistCard({
  item,
  isSelected,
  isDeleting,
  onSelect,
  onDelete,
}: WishlistCardProps) {
  const discountRate =
    item.product &&
    item.product.original_price > item.product.sale_price
      ? Math.round(
          ((item.product.original_price - item.product.sale_price) /
            item.product.original_price) *
            100
        )
      : 0;

  return (
    <Card className={`overflow-hidden ${isDeleting ? "opacity-50" : ""}`}>
      <CardContent className="p-0">
        <div className="flex">
          {/* 체크박스 */}
          <div className="p-4 flex items-start">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              disabled={isDeleting}
            />
          </div>

          {/* 이미지 */}
          <Link
            href={`/products/${item.product?.id}`}
            className="relative w-24 h-24 flex-shrink-0 bg-gray-100"
          >
            <Image
              src={item.product?.thumbnail || "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&q=80"}
              alt={item.product?.name || ""}
              fill
              className="object-cover"
              sizes="96px"
            />
            {item.product?.is_sold_out && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xs font-bold">품절</span>
              </div>
            )}
          </Link>

          {/* 정보 */}
          <div className="flex-1 p-4 min-w-0">
            <Link
              href={`/products/${item.product?.id}`}
              className="font-medium text-gray-900 hover:text-damda-yellow-dark line-clamp-1 text-sm"
            >
              {item.product?.name}
            </Link>
            {item.product?.region && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {item.product.region}
              </p>
            )}
            <div className="mt-2 flex items-baseline gap-2">
              {discountRate > 0 && (
                <>
                  <span className="text-sm font-bold text-red-500">
                    {discountRate}%
                  </span>
                  <span className="text-xs text-gray-400 line-through">
                    {item.product?.original_price.toLocaleString()}원
                  </span>
                </>
              )}
              <span className="font-bold text-gray-900">
                {item.product?.sale_price.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 액션 */}
          <div className="p-4 flex flex-col justify-between items-end">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-red-500 h-8 w-8"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={item.product?.is_sold_out || isDeleting}
              asChild
            >
              <Link href={`/products/${item.product?.id}`}>
                <ShoppingCart className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">찜 목록</h1>
      <div className="text-center py-16 bg-white rounded-xl">
        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          찜한 상품이 없습니다
        </h3>
        <p className="text-gray-500 mb-6">마음에 드는 체험을 찜해보세요!</p>
        <Button asChild className="bg-damda-yellow hover:bg-damda-yellow-dark">
          <Link href="/products">체험 상품 둘러보기</Link>
        </Button>
      </div>
    </div>
  );
}

function WishlistSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
