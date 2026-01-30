"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, PenLine, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

interface Review {
  id: string;
  product_id: string;
  rating: number;
  content: string;
  is_featured: boolean;
  created_at: string;
  product?: {
    id: string;
    name: string;
    thumbnail: string;
  };
  images?: {
    id: string;
    image_url: string;
  }[];
}

interface ReviewableReservation {
  id: string;
  reserved_date: string;
  participant_count: number;
  product?: {
    id: string;
    name: string;
    thumbnail: string;
  };
}

export default function MyReviewsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewable, setReviewable] = useState<ReviewableReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("written");

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      // 작성한 리뷰 조회
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select(
          `
          *,
          products:product_id (
            id,
            name,
            thumbnail
          ),
          review_images (
            id,
            image_url
          )
        `
        )
        .eq("daycare_id", user.id)
        .order("created_at", { ascending: false });

      if (reviewsData) {
        setReviews(
          reviewsData.map((item) => ({
            ...item,
            product: item.products as Review["product"],
            images: item.review_images as Review["images"],
          }))
        );
      }

      // 완료된 예약 조회 (리뷰 작성 가능)
      const { data: reservationsData } = await supabase
        .from("reservations")
        .select(
          `
          id,
          reserved_date,
          participant_count,
          products:product_id (
            id,
            name,
            thumbnail
          )
        `
        )
        .eq("daycare_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (reservationsData) {
        // 이미 리뷰가 있는 예약 제외
        const { data: existingReviews } = await supabase
          .from("reviews")
          .select("reservation_id")
          .eq("daycare_id", user.id);

        const reviewedIds = new Set(
          existingReviews?.map((r) => r.reservation_id) || []
        );

        setReviewable(
          reservationsData
            .filter((r) => !reviewedIds.has(r.id))
            .map((item) => ({
              ...item,
              product: item.products as unknown as ReviewableReservation["product"],
            }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  if (authLoading || isLoading) {
    return <ReviewsSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">내 리뷰</h1>
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            로그인이 필요합니다
          </h3>
          <Button asChild className="bg-damda-yellow hover:bg-damda-yellow-dark">
            <Link href="/login">로그인하기</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">내 리뷰</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="written">작성한 리뷰 ({reviews.length})</TabsTrigger>
          <TabsTrigger value="writable">작성 가능 ({reviewable.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="written" className="mt-4">
          {reviews.length === 0 ? (
            <EmptyWrittenState />
          ) : (
            <div className="border-t border-gray-200">
              {reviews.map((review, index) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  isLast={index === reviews.length - 1}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="writable" className="mt-4">
          {reviewable.length === 0 ? (
            <EmptyWritableState />
          ) : (
            <div className="border-t border-gray-200">
              {reviewable.map((reservation, index) => (
                <ReviewableItem
                  key={reservation.id}
                  reservation={reservation}
                  isLast={index === reviewable.length - 1}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewItem({ review, isLast }: { review: Review; isLast: boolean }) {
  return (
    <Link
      href={`/products/${review.product?.id}`}
      className={`flex items-center gap-3 py-3 hover:bg-gray-50 transition-colors ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      {/* 상품 썸네일 */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
        {review.product?.thumbnail ? (
          <Image
            src={review.product.thumbnail}
            alt={review.product?.name || "상품"}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Star className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>

      {/* 리뷰 정보 */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate text-sm">
          {review.product?.name || "상품 정보 없음"}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 ${
                  star <= review.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {format(parseISO(review.created_at), "yyyy.MM.dd", { locale: ko })}
          </span>
        </div>
      </div>

      {/* 추천 배지 & 화살표 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {review.is_featured && (
          <Badge className="text-xs bg-damda-yellow-light text-damda-yellow-dark">
            추천
          </Badge>
        )}
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </Link>
  );
}

function ReviewableItem({
  reservation,
  isLast,
}: {
  reservation: ReviewableReservation;
  isLast: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-3 ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      {/* 상품 썸네일 */}
      <Link
        href={`/products/${reservation.product?.id}`}
        className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100"
      >
        {reservation.product?.thumbnail ? (
          <Image
            src={reservation.product.thumbnail}
            alt={reservation.product?.name || "상품"}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PenLine className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </Link>

      {/* 예약 정보 */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate text-sm">
          {reservation.product?.name || "상품 정보 없음"}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <span>
            {format(parseISO(reservation.reserved_date), "M월 d일 (E)", {
              locale: ko,
            })}
          </span>
          <span>·</span>
          <span>{reservation.participant_count}명</span>
        </div>
      </div>

      {/* 리뷰 작성 버튼 */}
      <Button
        asChild
        size="sm"
        className="bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900 flex-shrink-0"
      >
        <Link href={`/mypage/reviews/write?reservationId=${reservation.id}`}>
          <PenLine className="w-3.5 h-3.5 mr-1" />
          리뷰 작성
        </Link>
      </Button>
    </div>
  );
}

function EmptyWrittenState() {
  return (
    <div className="text-center py-16 bg-gray-50 rounded-xl mt-4">
      <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">작성한 리뷰가 없습니다</h3>
      <p className="text-gray-500">체험 후 리뷰를 남겨주세요!</p>
    </div>
  );
}

function EmptyWritableState() {
  return (
    <div className="text-center py-16 bg-gray-50 rounded-xl mt-4">
      <PenLine className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">작성 가능한 리뷰가 없습니다</h3>
      <p className="text-gray-500 mb-6">체험을 완료하면 리뷰를 작성할 수 있습니다.</p>
      <Button asChild variant="outline">
        <Link href="/products">체험 상품 둘러보기</Link>
      </Button>
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="px-4 py-6">
      <Skeleton className="h-7 w-24 mb-4" />
      <Skeleton className="h-10 w-full mb-4" />
      <div className="border-t border-gray-200">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100">
            <Skeleton className="w-14 h-14 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="w-4 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
