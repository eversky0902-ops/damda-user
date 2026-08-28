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

export function Reviews({ actualReviews }: ReviewsProps) {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* Section header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            이용 후기
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            담다에 공개된 실제 이용 후기를 확인해 보세요.
            <br className="hidden sm:block" />
            기관명은 개인정보 보호를 위해 일부 마스킹해 표시합니다.
          </p>
        </div>

        {actualReviews.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-white px-6 py-12 text-center text-muted-foreground">
            <p className="font-medium text-foreground">등록된 이용 후기가 없습니다.</p>
            <p className="mt-2 text-sm">체험 완료 후 작성된 후기가 공개되면 이곳에서 확인할 수 있습니다.</p>
          </div>
        ) : (
          <HorizontalCarousel ariaLabel="실제 이용 후기" desktopItems={3}>
            {actualReviews.map((review) => {
              const reviewMonth = formatReviewMonth(review.created_at);
              return (
                <article
                  key={review.id}
                  data-review-source="actual"
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
        )}
      </div>
    </section>
  );
}
