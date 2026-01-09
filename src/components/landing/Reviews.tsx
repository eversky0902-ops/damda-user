"use client";

import { Star, Quote } from "lucide-react";

const mockReviews = [
  {
    rating: 5,
    content: "아이들이 정말 즐거워했어요. 프로그램 구성이 알차고 선생님들도 친절하셨습니다. 다음에도 꼭 다시 이용하고 싶어요.",
    daycare: "햇살어린이집",
    product: "동물농장 체험",
  },
  {
    rating: 5,
    content: "체험 내용이 교육적이면서도 재미있었어요. 아이들 눈높이에 맞춘 설명이 인상적이었습니다.",
    daycare: "푸른숲어린이집",
    product: "숲속 생태체험",
  },
  {
    rating: 4,
    content: "예약부터 체험까지 전 과정이 매끄러웠어요. 담당자분이 세심하게 챙겨주셔서 감사했습니다.",
    daycare: "사랑가득어린이집",
    product: "전통문화 체험",
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
            각 프로그램 페이지에서 실제로 이용한 어린이집들의 생생한 후기를 확인할 수 있어요.
            <br className="hidden sm:block" />
            별점, 상세 후기, 아이들 반응까지 꼼꼼히 살펴보고 우리 어린이집에 맞는 프로그램을 선택하세요.
          </p>
        </div>

        {/* Blurred review cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 blur-[5px] select-none pointer-events-none opacity-70">
          {mockReviews.map((review, index) => (
            <div
              key={index}
              className="relative rounded-2xl border border-border/50 bg-white p-6"
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
                <p className="text-sm text-muted-foreground">{review.product}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
