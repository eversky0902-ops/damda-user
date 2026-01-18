"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, PenLine, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-gray-900">내 리뷰</h1>
        <div className="text-center py-16 bg-white rounded-xl">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">내 리뷰</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="written">작성한 리뷰 ({reviews.length})</TabsTrigger>
          <TabsTrigger value="writable">작성 가능 ({reviewable.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="written" className="mt-6">
          {reviews.length === 0 ? (
            <EmptyWrittenState />
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="writable" className="mt-6">
          {reviewable.length === 0 ? (
            <EmptyWritableState />
          ) : (
            <div className="space-y-4">
              {reviewable.map((reservation) => (
                <ReviewableCard key={reservation.id} reservation={reservation} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 이미지 */}
          <Link
            href={`/products/${review.product?.id}`}
            className="relative w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
          >
            <Image
              src={review.product?.thumbnail || "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&q=80"}
              alt={review.product?.name || ""}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 96px"
            />
          </Link>

          <div className="flex-1 min-w-0">
            {/* 상품명 */}
            <Link
              href={`/products/${review.product?.id}`}
              className="font-medium text-gray-900 hover:text-damda-yellow-dark line-clamp-1 mb-2"
            >
              {review.product?.name}
            </Link>

            {/* 평점 & 날짜 */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
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
              {review.is_featured && (
                <Badge variant="secondary" className="text-xs bg-damda-yellow-light text-damda-yellow-dark">
                  추천 리뷰
                </Badge>
              )}
            </div>

            {/* 리뷰 내용 */}
            <p className="text-sm text-gray-700 line-clamp-3">{review.content}</p>

            {/* 리뷰 이미지 */}
            {review.images && review.images.length > 0 && (
              <div className="flex gap-2 mt-3">
                {review.images.map((image) => (
                  <div
                    key={image.id}
                    className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100"
                  >
                    <Image
                      src={image.image_url}
                      alt="리뷰 이미지"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewableCard({ reservation }: { reservation: ReviewableReservation }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 이미지 */}
          <Link
            href={`/products/${reservation.product?.id}`}
            className="relative w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
          >
            <Image
              src={reservation.product?.thumbnail || "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&q=80"}
              alt={reservation.product?.name || ""}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 96px"
            />
          </Link>

          <div className="flex-1 min-w-0">
            {/* 상품명 */}
            <Link
              href={`/products/${reservation.product?.id}`}
              className="font-medium text-gray-900 hover:text-damda-yellow-dark line-clamp-1 mb-2"
            >
              {reservation.product?.name}
            </Link>

            {/* 예약 정보 */}
            <p className="text-sm text-gray-500 flex items-center gap-1 mb-4">
              <Calendar className="w-4 h-4" />
              {format(parseISO(reservation.reserved_date), "yyyy.MM.dd (EEE)", {
                locale: ko,
              })}
              · {reservation.participant_count}명 체험
            </p>

            {/* 리뷰 작성 버튼 */}
            <Button asChild className="bg-damda-yellow hover:bg-damda-yellow-dark">
              <Link href={`/mypage/reviews/new?reservationId=${reservation.id}`}>
                <PenLine className="w-4 h-4 mr-2" />
                리뷰 작성하기
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyWrittenState() {
  return (
    <div className="text-center py-16 bg-white rounded-xl">
      <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">작성한 리뷰가 없습니다</h3>
      <p className="text-gray-500">체험 후 리뷰를 남겨주세요!</p>
    </div>
  );
}

function EmptyWritableState() {
  return (
    <div className="text-center py-16 bg-white rounded-xl">
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
    <div className="space-y-6">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-10 w-full" />
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6">
            <div className="flex gap-4">
              <Skeleton className="w-24 h-24 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
