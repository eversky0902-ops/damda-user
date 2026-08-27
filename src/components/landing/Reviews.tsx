"use client";

import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import { HorizontalCarousel } from "./HorizontalCarousel";
import type { LandingReview } from "@/services/reviewService";

const reviewContents = [
  "이전에는 체험학습처를 찾아보기가 어려웠는데, 홈페이지에서 검색부터 결제까지 쉽게 할 수 있어 매우 편리하고 좋았어요.",
  "체험학습 장소를 알아볼 때마다 시간이 오래 걸렸는데, 다양한 업체를 한눈에 비교하고 바로 예약할 수 있어 업무가 훨씬 편해졌어요.",
  "여러 체험처의 프로그램과 일정을 한곳에서 확인하고 결제까지 이어져서 좋았어요. 예약 과정도 어렵지 않아 만족했습니다.",
  "아이들에게 맞는 체험처를 찾는 일이 늘 고민이었는데, 지역과 프로그램별로 쉽게 찾고 예약할 수 있어 정말 편리했어요.",
  "예전에는 업체마다 전화로 문의해야 했지만, 홈페이지에서 필요한 정보를 확인하고 결제까지 한 번에 할 수 있어 시간을 많이 줄였어요.",
  "체험처를 찾고 예약하는 과정이 복잡했는데, 원하는 프로그램을 비교한 뒤 바로 결제할 수 있어 선생님들도 사용하기 편했습니다.",
  "지역별 체험 프로그램을 빠르게 찾아볼 수 있고 비용도 비교할 수 있어서 체험학습 준비가 한결 수월해졌어요.",
  "검색한 체험처를 바로 예약하고 결제할 수 있어 여러 사이트를 오갈 필요가 없다는 점이 가장 편리했습니다.",
  "아이들 연령에 맞는 프로그램을 쉽게 찾을 수 있고 예약 진행 상황도 확인할 수 있어서 안심하고 이용했어요.",
  "체험학습 준비에 필요한 정보를 한눈에 확인할 수 있어 좋았고, 결제 과정도 간단해서 다음에도 이용하고 싶어요.",
];

const daycareNames = [
  "인천 꽃** 어린이집", "서울 햇** 어린이집", "경기 사** 어린이집", "인천 하** 어린이집", "경기 꿈** 어린이집",
  "서울 새** 어린이집", "인천 별** 어린이집", "경기 푸** 어린이집", "서울 다** 어린이집", "인천 예** 어린이집",
  "경기 아** 어린이집", "서울 초** 어린이집", "인천 나** 어린이집", "경기 해** 어린이집", "서울 소** 어린이집",
  "인천 늘** 어린이집", "경기 은** 어린이집", "서울 참** 어린이집", "인천 파** 어린이집", "경기 한** 어린이집",
  "서울 숲** 어린이집", "인천 꿈** 어린이집", "경기 샘** 어린이집", "서울 별** 어린이집", "인천 새** 어린이집",
  "경기 꽃** 어린이집", "서울 아** 어린이집", "인천 해** 어린이집", "경기 초** 어린이집", "서울 예** 어린이집",
];

const reviewPool = daycareNames.map((daycare, index) => ({
  key: `sample-${index}`,
  rating: index % 6 === 0 ? 4 : 5,
  content: reviewContents[index % reviewContents.length],
  daycare,
  source: "sample" as const,
}));

type DisplayReview = (typeof reviewPool)[number] | {
  key: string;
  rating: number;
  content: string;
  daycare: string;
  source: "actual";
};

function shuffleReviews<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function mapActualReviews(actualReviews: LandingReview[]): DisplayReview[] {
  return actualReviews.slice(0, 30).map((review) => ({
    key: `actual-${review.id}`,
    rating: review.rating,
    content: review.content,
    daycare: review.daycare_label,
    source: "actual" as const,
  }));
}

interface ReviewsProps {
  actualReviews: LandingReview[];
}

export function Reviews({ actualReviews }: ReviewsProps) {
  const actual = mapActualReviews(actualReviews);
  const initialCount = Math.max(24, actual.length);
  const [reviews, setReviews] = useState<DisplayReview[]>(() => [
    ...actual,
    ...reviewPool.slice(0, Math.max(0, initialCount - actual.length)),
  ].slice(0, 30));

  useEffect(() => {
    const minimumCount = Math.max(20, actual.length);
    const visibleCount = minimumCount + Math.floor(Math.random() * (31 - minimumCount));
    const fillers = shuffleReviews(reviewPool).slice(0, Math.max(0, visibleCount - actual.length));
    setReviews(shuffleReviews([...actual, ...fillers]).slice(0, 30));
  }, [actualReviews]);

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* Section header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            이용 후기
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            체험 선택에 참고할 수 있는 어린이집 후기를 확인해 보세요.
            <br className="hidden sm:block" />
            별점과 아이들 반응을 살펴보고 우리 어린이집에 맞는 프로그램을 선택하세요.
          </p>
        </div>

        <HorizontalCarousel
          ariaLabel="이용 후기"
          desktopItems={3}
        >
          {reviews.map((review) => (
            <div
              key={review.key}
              data-review-source={review.source}
              className="relative h-full rounded-2xl border border-border/50 bg-white p-6 shadow-sm"
            >
              <Quote className="absolute right-4 top-4 h-8 w-8 text-primary/10" />
              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating
                        ? "fill-primary text-primary"
                        : "text-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="mb-4 line-clamp-3 text-muted-foreground">
                {review.content}
              </p>
              <div className="border-t pt-4">
                <p className="font-medium">{review.daycare}</p>
              </div>
            </div>
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
