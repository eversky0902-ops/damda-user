"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Review } from "@/services/reviewService";

// 기본 이미지 (상품 썸네일이 없을 경우)
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80";

interface BestReviewsCarouselProps {
  reviews: Review[];
}

export function BestReviewsCarousel({ reviews }: BestReviewsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 무한 스크롤을 위해 앞뒤로 복제
  const extendedReviews = [...reviews, ...reviews, ...reviews];
  const startOffset = reviews.length;

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  }, [isTransitioning]);

  const goToPrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  }, [isTransitioning]);

  // 무한 스크롤 처리
  useEffect(() => {
    if (!isTransitioning) return;

    const timeout = setTimeout(() => {
      setIsTransitioning(false);

      // 범위 벗어나면 조용히 리셋
      if (currentIndex >= reviews.length) {
        setCurrentIndex(0);
      } else if (currentIndex < 0) {
        setCurrentIndex(reviews.length - 1);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [currentIndex, isTransitioning, reviews.length]);

  // 자동 재생
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(goToNext, 3000);
    return () => clearInterval(interval);
  }, [isPlaying, goToNext]);

  const translateX = -((startOffset + currentIndex) * (100 / 3));

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left side - Title */}
          <div className="lg:w-48 flex-shrink-0">
            <Quote className="w-10 h-10 text-damda-yellow mb-3" />
            <h2 className="text-2xl font-bold text-gray-900">BEST 리뷰</h2>
            <p className="text-sm text-gray-500 mt-2">
              담다와 함께한 소중한<br />추억의 페이지
            </p>
            <Link
              href="/reviews"
              className="inline-block mt-4 px-4 py-2 bg-damda-yellow text-gray-900 font-medium rounded-lg text-sm hover:bg-damda-yellow-dark transition-colors"
            >
              베스트 후기
            </Link>
          </div>

          {/* Right side - Review cards */}
          <div className="flex-1 overflow-hidden" ref={containerRef}>
            <div
              className="flex -mx-2"
              style={{
                transform: `translateX(calc(-${(startOffset + currentIndex)} * (100% / 3)))`,
                transition: isTransitioning ? "transform 0.5s ease-in-out" : "none",
              }}
            >
              {extendedReviews.map((review, index) => (
                <div
                  key={`${review.id}-${index}`}
                  className="flex-shrink-0 px-2"
                  style={{ width: "calc(100% / 3)" }}
                >
                  <ReviewCard
                    review={review}
                    index={index % reviews.length}
                  />
                </div>
              ))}
            </div>

            {/* Slider controls */}
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={goToPrev}
                className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-gray-600" />
                ) : (
                  <Play className="w-4 h-4 text-gray-600" />
                )}
              </button>
              <button
                onClick={goToNext}
                className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
  const tagColors = [
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-blue-100 text-blue-700",
  ];
  const tagColor = tagColors[index % tagColors.length];
  const productImage = review.product?.thumbnail || DEFAULT_IMAGE;
  const productId = review.product?.id;

  const cardContent = (
    <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow h-[340px] flex flex-col cursor-pointer">
      {/* Image */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 flex-shrink-0">
        <Image
          src={productImage}
          alt={review.product?.name || "체험 후기"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {/* Tag */}
        <div className="absolute top-3 left-3">
          <Badge className={`${tagColor} text-xs`}>
            {review.product?.name ? "소중한 체험" : "체험 후기"}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 min-h-0">
        <h3 className="font-bold text-gray-900 mb-2 truncate flex-shrink-0">
          {review.product?.name || "즐거운 체험 후기"}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 flex-1">{review.content}</p>
        {/* Daycare name */}
        {review.daycare?.name && (
          <p className="text-xs text-gray-400 mt-2 flex-shrink-0">- {review.daycare.name}</p>
        )}
      </div>
    </div>
  );

  if (productId) {
    return (
      <Link href={`/products/${productId}`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
