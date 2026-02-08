"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, ChevronDown, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { ProductReview, ReviewStats } from "@/services/productService";

interface ProductReviewsProps {
  reviews: ProductReview[];
  stats: ReviewStats;
  totalPages: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function ProductReviews({
  reviews,
  stats,
  totalPages,
  onLoadMore,
  hasMore = false,
}: ProductReviewsProps) {
  const [expandedImages, setExpandedImages] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* 리뷰 통계 */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* 평균 평점 */}
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-900">{stats.averageRating}</div>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "w-5 h-5",
                    star <= Math.round(stats.averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  )}
                />
              ))}
            </div>
            <div className="text-sm text-gray-500 mt-1">{stats.totalCount}개의 리뷰</div>
          </div>

          {/* 평점 분포 */}
          <div className="flex-1 space-y-2">
            {stats.ratingDistribution.map(({ rating, count }) => {
              const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-6">{rating}점</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 리뷰 목록 */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          아직 작성된 리뷰가 없습니다.
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
              {/* 리뷰 헤더 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-damda-yellow-light rounded-full flex items-center justify-center">
                    <span className="text-damda-yellow-dark font-medium">
                      {review.daycare?.name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {review.daycare?.name || "익명"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(review.created_at), "yyyy.MM.dd", { locale: ko })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "w-4 h-4",
                        star <= review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* 리뷰 내용 */}
              <p className="text-gray-700 whitespace-pre-wrap">{review.content}</p>

              {/* 리뷰 이미지 */}
              {review.images && review.images.length > 0 && (
                <div className="mt-4">
                  <div className="flex gap-2 flex-wrap">
                    {review.images.slice(0, expandedImages === review.id ? undefined : 4).map((image, index) => (
                      <button
                        key={image.id}
                        className="relative w-28 h-28 rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(image.image_url)}
                      >
                        <Image
                          src={image.image_url}
                          alt={`리뷰 이미지 ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="112px"
                        />
                        {index === 3 && review.images!.length > 4 && expandedImages !== review.id && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-medium">
                            +{review.images!.length - 4}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {review.images.length > 4 && (
                    <button
                      onClick={() => setExpandedImages(expandedImages === review.id ? null : review.id)}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      {expandedImages === review.id ? "접기" : `전체보기 (${review.images.length})`}
                    </button>
                  )}
                </div>
              )}

              {/* 추천 뱃지 */}
              {review.is_featured && (
                <div className="mt-3">
                  <span className="inline-flex items-center px-2 py-1 bg-damda-yellow-light text-damda-yellow-dark text-xs rounded-full">
                    ⭐ 추천 리뷰
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 더보기 버튼 */}
      {hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={onLoadMore}>
            리뷰 더보기
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="w-auto max-w-[90vw] sm:max-w-[90vw] p-0 gap-0 bg-transparent border-none shadow-none" showCloseButton={false}>
          <DialogTitle className="sr-only">리뷰 이미지 확대</DialogTitle>
          <div className="relative">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="리뷰 이미지 확대"
                className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              />
            )}
            <DialogClose className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 hover:bg-black/70 transition-colors">
              <X className="h-5 w-5 text-white" />
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
