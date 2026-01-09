"use client";

import { UserCheck, Search, ShoppingCart, CalendarCheck, Printer } from "lucide-react";

const steps = [
  {
    icon: UserCheck,
    step: "01",
    title: "어린이집 인증",
    description: "국공립 어린이집 인증 서류를 제출하고 승인을 받으세요.",
  },
  {
    icon: Search,
    step: "02",
    title: "프로그램 검색",
    description: "카테고리, 지역, 날짜별로 원하는 프로그램을 검색하세요.",
  },
  {
    icon: ShoppingCart,
    step: "03",
    title: "장바구니 담기",
    description: "마음에 드는 프로그램을 장바구니에 담고 인원을 선택하세요.",
  },
  {
    icon: CalendarCheck,
    step: "04",
    title: "예약 · 결제",
    description: "결제 후 예약을 확정하세요.",
  },
  {
    icon: Printer,
    step: "05",
    title: "인쇄 · 통지",
    description: "가정통신문 등 행정서류를 인쇄해서 학부모에게 전달하세요.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* Section header */}
        <div className="mb-12 text-center md:mb-16">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            이용 방법
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            어린이집 인증 후 간편하게 이용하세요
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {/* Connector line (desktop) */}
          <div className="absolute left-0 right-0 top-10 hidden h-0.5 bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

          {steps.map((item, index) => (
            <div
              key={item.step}
              className="relative flex flex-col items-center text-center"
            >
              {/* Icon with step number */}
              <div className="relative mb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-border/50">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                {/* Step number badge */}
                <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-md">
                  {index + 1}
                </div>
              </div>

              {/* Content */}
              <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>

              {/* Arrow (desktop) */}
              {index < steps.length - 1 && (
                <div className="absolute -right-6 top-10 hidden -translate-y-1/2 text-muted-foreground/50 lg:block">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
