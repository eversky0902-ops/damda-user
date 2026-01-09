"use client";

import { Search, CalendarCheck, CreditCard, MessageSquare, Printer, Heart } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "카테고리 · 지역별 검색",
    description:
      "원하는 체험 종류와 지역을 선택해 우리 어린이집에 딱 맞는 프로그램을 찾아보세요.",
  },
  {
    icon: CalendarCheck,
    title: "날짜 · 인원 맞춤 예약",
    description:
      "원하는 날짜와 참여 인원을 선택하고, 장바구니에 담아 한 번에 예약하세요.",
  },
  {
    icon: CreditCard,
    title: "간편 결제",
    description:
      "안전한 결제 시스템으로 편리하게 결제하세요.",
  },
  {
    icon: Heart,
    title: "찜하기 · 리뷰",
    description:
      "마음에 드는 프로그램은 찜해두고, 다른 어린이집의 실제 후기를 확인하세요.",
  },
  {
    icon: MessageSquare,
    title: "1:1 문의 · 카카오톡 상담",
    description:
      "궁금한 점은 1:1 문의나 카카오톡 채널로 빠르게 상담받으세요.",
  },
  {
    icon: Printer,
    title: "인쇄서비스",
    description:
      "가정통신문, 안내문 등 어린이집 행정에 필요한 인쇄물도 인쇄할 수 있어요.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-secondary/30 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* Section header */}
        <div className="mb-12 text-center md:mb-16">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            <span className="text-primary">담다</span>에서 할 수 있는 것들
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            현장체험 예약부터 행정서비스까지, 어린이집 업무를 한 곳에서
          </p>
        </div>

        {/* Features grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border/50 bg-white p-6 transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
