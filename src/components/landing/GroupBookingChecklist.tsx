import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const checklist = [
  { label: "권장 연령과 최소·최대 참여 인원", layout: "md:col-start-1 md:row-start-1" },
  { label: "체험 시간과 준비물", layout: "md:col-start-3 md:row-start-1" },
  { label: "대형버스 주차 가능 여부", layout: "md:col-start-5 md:row-start-1" },
  { label: "단체 식사 및 휴게 공간", layout: "md:col-start-7 md:row-start-1" },
  { label: "우천 시 운영 여부", layout: "md:col-start-2 md:row-start-2" },
  { label: "안전수칙과 보험 확인", layout: "md:col-start-4 md:row-start-2" },
  { label: "취소/환불 기준", layout: "md:col-start-6 md:row-start-2" },
];

export function GroupBookingChecklist() {
  return (
    <section id="group-booking-checklist" aria-labelledby="booking-checklist-title" className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="overflow-hidden rounded-3xl border border-primary/15 bg-primary/5 p-6 sm:p-8 md:p-10">
          <div className="space-y-8">
            <div className="text-center">
              <h2
                id="booking-checklist-title"
                className="text-2xl font-bold tracking-tight sm:whitespace-nowrap sm:text-3xl md:text-4xl"
              >
                어린이집 단체체험학습 예약 전에 확인하세요
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                <span className="block">운영 조건은 업체와 프로그램마다 다릅니다.</span>
                <span className="block">
                  예약 전 상세페이지에서 필요한 항목을 확인하고, 표시되지 않은 정보는 업체 문의를 통해 확인해 주세요.
                </span>
              </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-8">
              {checklist.map((item) => (
                <li
                  key={item.label}
                  className={`flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm shadow-sm md:col-span-2 ${item.layout}`}
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-center">
              <Button asChild size="lg" className="group rounded-full px-7 text-black">
                <Link href="/products">
                  체험 프로그램 비교하기
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
