"use client";

import { Star, Quote } from "lucide-react";
import { HorizontalCarousel } from "./HorizontalCarousel";

const mockReviews = [
  {
    rating: 5,
    content: "아이들이 정말 즐거워했어요. 프로그램 구성이 알차고 선생님들도 친절하셨습니다. 다음에도 꼭 다시 이용하고 싶어요.",
    daycare: "인천 꽃** 어린이집",
  },
  {
    rating: 5,
    content: "체험 내용이 교육적이면서도 재미있었어요. 아이들 눈높이에 맞춘 설명이 인상적이었습니다.",
    daycare: "서울 햇** 어린이집",
  },
  {
    rating: 4,
    content: "예약부터 체험까지 전 과정이 매끄러웠어요. 담당자분이 세심하게 챙겨주셔서 감사했습니다.",
    daycare: "경기 사** 어린이집",
  },
  {
    rating: 5,
    content: "아이들이 직접 만들고 만져볼 수 있어서 집중도가 높았어요. 활동 후에도 체험 이야기를 계속 나눌 만큼 반응이 좋았습니다.",
    daycare: "인천 하** 어린이집",
  },
  {
    rating: 5,
    content: "안내가 자세하고 이동 동선도 편리했어요. 단체 방문인데도 프로그램이 차분하게 진행되어 만족했습니다.",
    daycare: "경기 꿈** 어린이집",
  },
  {
    rating: 4,
    content: "연령에 맞게 설명해 주셔서 아이들이 어렵지 않게 참여했어요. 준비물과 일정 안내도 알아보기 쉬웠습니다.",
    daycare: "서울 새** 어린이집",
  },
];

export function Reviews() {
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
          itemClassName="basis-[90%] sm:basis-1/2 lg:basis-1/3"
        >
          {mockReviews.map((review, index) => (
            <div
              key={index}
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
