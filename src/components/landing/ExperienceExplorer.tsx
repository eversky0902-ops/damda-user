import Link from "next/link";
import { ArrowRight, Baby, CalendarDays, MapPin, Shapes, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const conditions = [
  { icon: MapPin, title: "지역", description: "시·도와 구·군 기준으로\n가까운 체험처 찾기" },
  { icon: Shapes, title: "체험 유형", description: "실내놀이, 자연, 공연 등\n프로그램 유형 비교" },
  { icon: Baby, title: "권장 연령", description: "프로그램에 등록된\n권장 연령 확인" },
  { icon: Users, title: "참여 인원", description: "최소·최대 예약 가능 인원 확인" },
  { icon: CalendarDays, title: "희망 날짜", description: "원하는 날짜에 운영 가능한\n프로그램 검색" },
];

export function ExperienceExplorer() {
  return (
    <section aria-labelledby="experience-explorer-title" className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 id="experience-explorer-title" className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            어린이집 단체체험학습, 조건에 맞게 찾아보세요
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            아이들의 연령과 참여 인원, 지역과 체험 유형을 기준으로 우리 기관에 맞는 프로그램을 확인하세요.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {conditions.map((condition) => (
            <li key={condition.title} className="rounded-2xl border border-border/60 bg-secondary/20 p-5">
              <condition.icon className="mb-4 h-7 w-7 text-primary" aria-hidden="true" />
              <h3 className="font-semibold text-foreground">{condition.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{condition.description}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="group rounded-full px-7">
            <Link href="/products">
              조건 설정하고 프로그램 찾기
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
