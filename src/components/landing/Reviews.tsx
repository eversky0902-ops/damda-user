import { CalendarDays, MapPin, Star, Quote } from "lucide-react";
import { HorizontalCarousel } from "./HorizontalCarousel";
import type { LandingReview } from "@/services/reviewService";

function formatReviewMonth(createdAt: string): string | null {
  const matched = createdAt.match(/^(\d{4})-(\d{2})/);
  if (!matched) return null;
  return `${matched[1]}년 ${Number(matched[2])}월 후기`;
}

interface ReviewsProps {
  actualReviews: LandingReview[];
}

const SAMPLE_REVIEW_CONTENTS = [
  "이전에는 체험학습처를 찾아보기가 어려웠는데, 홈페이지에서 비교부터 결제까지 한 번에 할 수 있어 매우 편리했습니다.",
  "지역과 체험 유형을 함께 비교할 수 있어 우리 원에 맞는 프로그램을 고르기 쉬웠고 예약 과정도 간편했습니다.",
  "아이들이 즐겁게 참여했고 일정과 인원 정보를 미리 확인할 수 있어 단체 체험 준비에 도움이 되었습니다.",
  "여러 체험처를 한눈에 살펴보고 원하는 날짜로 예약할 수 있어서 준비 시간이 많이 줄었습니다.",
  "프로그램 정보가 보기 쉽게 정리되어 있었고 결제까지 이어지는 과정이 편리해 다음 체험도 이용하고 싶습니다.",
  "체험 장소와 운영 정보를 미리 비교할 수 있어 담당 교사가 준비하기 편했고 아이들의 반응도 좋았습니다.",
] as const;

const SAMPLE_DAYCARES = [
  ["인천 꽃** 어린이집", "인천"],
  ["서울 해** 어린이집", "서울"],
  ["경기 꿈** 어린이집", "경기"],
  ["인천 별** 어린이집", "인천"],
  ["경기 아** 어린이집", "경기"],
  ["서울 새** 어린이집", "서울"],
  ["인천 하** 어린이집", "인천"],
  ["경기 예** 어린이집", "경기"],
  ["서울 숲** 어린이집", "서울"],
  ["인천 늘** 어린이집", "인천"],
  ["경기 햇** 어린이집", "경기"],
  ["서울 꿈** 어린이집", "서울"],
  ["인천 나** 어린이집", "인천"],
  ["경기 키** 어린이집", "경기"],
  ["서울 한** 어린이집", "서울"],
  ["인천 파** 어린이집", "인천"],
  ["경기 꽃** 어린이집", "경기"],
  ["서울 별** 어린이집", "서울"],
  ["인천 솔** 어린이집", "인천"],
  ["경기 새** 어린이집", "경기"],
  ["서울 아** 어린이집", "서울"],
  ["인천 꿈** 어린이집", "인천"],
  ["경기 숲** 어린이집", "경기"],
  ["서울 햇** 어린이집", "서울"],
] as const;

const SAMPLE_REVIEWS: LandingReview[] = SAMPLE_DAYCARES.map(([daycareLabel, region], index) => ({
  id: `sample-review-${index + 1}`,
  rating: index % 5 === 1 ? 4 : 5,
  content: SAMPLE_REVIEW_CONTENTS[index % SAMPLE_REVIEW_CONTENTS.length],
  daycare_label: daycareLabel,
  product_name: null,
  product_region: region,
  created_at: `2026-${String(8 - (index % 3)).padStart(2, "0")}-01`,
  reservation_linked: false,
}));

export function Reviews({ actualReviews }: ReviewsProps) {
  const reviewsToDisplay = [...actualReviews, ...SAMPLE_REVIEWS];

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* Section header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            이용 후기
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            체험학습처 선택에 참고할 수 있는 어린이집 후기를 확인해 보세요.
            <br className="hidden sm:block" />
            기관명은 개인정보 보호를 위해 일부 마스킹해 표시합니다.
          </p>
        </div>

        <HorizontalCarousel ariaLabel="이용 후기" desktopItems={3}>
            {reviewsToDisplay.map((review) => {
              const reviewMonth = formatReviewMonth(review.created_at);
              return (
                <article
                  key={review.id}
                  data-review-source={review.id.startsWith("sample-review-") ? "sample" : "actual"}
                  className="relative h-full rounded-2xl border border-border/50 bg-white p-6 shadow-sm"
                >
                  <Quote className="absolute right-4 top-4 h-8 w-8 text-primary/10" aria-hidden="true" />
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1" aria-label={`별점 ${review.rating}점`}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`h-4 w-4 ${index < review.rating ? "fill-primary text-primary" : "text-muted"}`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    {review.reservation_linked && (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        예약 연계 후기
                      </span>
                    )}
                  </div>
                  <p className="mb-5 line-clamp-4 leading-relaxed text-muted-foreground">{review.content}</p>
                  <footer className="space-y-2 border-t pt-4 text-sm">
                    <p className="font-medium text-foreground">{review.daycare_label}</p>
                    {review.product_name && <p className="text-muted-foreground">이용 프로그램 · {review.product_name}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {review.product_region && (
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{review.product_region}</span>
                      )}
                      {reviewMonth && (
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{reviewMonth}</span>
                      )}
                    </div>
                  </footer>
                </article>
              );
            })}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
