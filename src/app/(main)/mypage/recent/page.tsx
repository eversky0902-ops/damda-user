"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Trash2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  getRecentViewsClient,
  removeRecentView,
  clearRecentViews,
  type RecentViewProduct,
} from "./actions";

export default function RecentProductsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<RecentViewProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isClearing, setIsClearing] = useState(false);

  const fetchRecentViews = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getRecentViewsClient();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch recent views:", error);
      toast.error("최근 본 상품을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchRecentViews();
    }
  }, [authLoading, fetchRecentViews]);

  const handleDelete = async (productId: string) => {
    setDeletingIds((prev) => new Set(prev).add(productId));

    try {
      const success = await removeRecentView(productId);
      if (success) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        toast.success("삭제했습니다.");
      } else {
        toast.error("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("삭제에 실패했습니다.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);

    try {
      const success = await clearRecentViews();
      if (success) {
        setProducts([]);
        toast.success("전체 삭제했습니다.");
      } else {
        toast.error("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to clear:", error);
      toast.error("삭제에 실패했습니다.");
    } finally {
      setIsClearing(false);
    }
  };

  if (authLoading || isLoading) {
    return <RecentProductsSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">최근 본 상품</h1>
        <div className="text-center py-16 bg-white rounded-xl">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            로그인이 필요합니다
          </h3>
          <p className="text-gray-500 mb-6">
            최근 본 상품을 확인하려면 로그인해주세요.
          </p>
          <Button asChild className="bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900">
            <Link href="/login">로그인하기</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">최근 본 상품</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          disabled={isClearing}
          className="text-gray-500 hover:text-red-500"
        >
          {isClearing ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-1" />
          )}
          전체 삭제
        </Button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        최근 본 상품 {products.length}개
      </p>

      {/* 상품 목록 */}
      <div className="border-t border-gray-200">
        {products.map((product, index) => (
          <RecentProductItem
            key={product.id}
            product={product}
            isLast={index === products.length - 1}
            isDeleting={deletingIds.has(product.id)}
            onDelete={() => handleDelete(product.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface RecentProductItemProps {
  product: RecentViewProduct;
  isLast: boolean;
  isDeleting: boolean;
  onDelete: () => void;
}

function RecentProductItem({ product, isLast, isDeleting, onDelete }: RecentProductItemProps) {
  const [imageError, setImageError] = useState(false);
  const discountRate =
    product.original_price > product.sale_price
      ? Math.round(
          ((product.original_price - product.sale_price) / product.original_price) * 100
        )
      : 0;

  const timeAgo = getTimeAgo(new Date(product.viewed_at).getTime());

  return (
    <div
      className={`flex items-center gap-3 py-3 ${
        !isLast ? "border-b border-gray-100" : ""
      } ${isDeleting ? "opacity-50" : ""}`}
    >
      {/* 상품 썸네일 */}
      <Link
        href={`/products/${product.id}`}
        className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50"
      >
        {imageError || !product.thumbnail ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="담다"
              width={32}
              height={20}
              className="opacity-30"
            />
          </div>
        ) : (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover"
            sizes="56px"
            onError={() => setImageError(true)}
          />
        )}
      </Link>

      {/* 상품 정보 */}
      <Link href={`/products/${product.id}`} className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate text-sm">{product.name}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          {product.region && (
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {product.region}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>
      </Link>

      {/* 가격 */}
      <div className="text-right flex-shrink-0">
        {discountRate > 0 && (
          <span className="text-xs font-bold text-red-500 mr-1">{discountRate}%</span>
        )}
        <p className="text-sm font-medium text-gray-900">
          {product.sale_price.toLocaleString()}원
        </p>
      </div>

      {/* 삭제 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        className="text-gray-400 hover:text-red-500 h-8 w-8 flex-shrink-0"
        onClick={(e) => {
          e.preventDefault();
          onDelete();
        }}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return new Date(timestamp).toLocaleDateString("ko-KR");
}

function EmptyState() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">최근 본 상품</h1>
      <div className="text-center py-16 bg-gray-50 rounded-xl">
        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          최근 본 상품이 없습니다
        </h3>
        <p className="text-gray-500 mb-6">다양한 체험 상품을 둘러보세요!</p>
        <Button asChild className="bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900">
          <Link href="/products">체험 상품 둘러보기</Link>
        </Button>
      </div>
    </div>
  );
}

function RecentProductsSkeleton() {
  return (
    <div className="px-4 py-6">
      <div className="flex justify-between mb-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-5 w-48 mb-4" />
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
