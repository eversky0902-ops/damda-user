"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarCheck, Play, Star, Shield, MapPin } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-white to-white pt-20">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[20%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[10%] top-[30%] h-56 w-56 rounded-full bg-[#7BAE7F]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm">
            <Shield className="h-4 w-4" />
            어린이집·유치원 단체체험 예약 플랫폼
          </div>

          {/* Main heading */}
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            어린이집 단체체험학습,
            <br />
            <span className="text-primary">비교하고 한 번에 예약하세요</span>
          </h1>

          {/* Subtitle */}
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            지역·연령·참여 인원에 맞는 체험 프로그램을 찾아보고
            <br className="hidden sm:block" />
            일정 확인부터 예약·결제까지 담다에서 간편하게 진행하세요.
          </p>

          {/* CTA buttons */}
          <div className="mb-12 flex flex-col gap-4 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="group h-12 gap-2 rounded-full px-8 text-base font-semibold shadow-lg shadow-primary/20"
            >
              <Link href="/signup" data-analytics-metric="signup_cta_click">
                기관 가입신청하기
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-12 gap-2 rounded-full border-2 px-8 text-base font-semibold"
            >
              <Link href="/partner" data-analytics-metric="partner_cta_click">
                <Play className="h-4 w-4 fill-current" />
                제휴 입점문의
              </Link>
            </Button>
          </div>

          {/* Key benefits */}
          <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-semibold">검증된 체험 업체</div>
                <div className="text-sm text-muted-foreground">입점 정보 확인</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7BAE7F]/10">
                <MapPin className="h-6 w-6 text-[#7BAE7F]" />
              </div>
              <div className="text-center">
                <div className="font-semibold">지역별 프로그램 검색</div>
                <div className="text-sm text-muted-foreground">가까운 체험처 비교</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5B8DEF]/10">
                <CalendarCheck className="h-6 w-6 text-[#5B8DEF]" />
              </div>
              <div className="text-center">
                <div className="font-semibold">날짜·인원 맞춤 예약</div>
                <div className="text-sm text-muted-foreground">조건에 맞춰 확인</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E07A5F]/10">
                <Star className="h-6 w-6 text-[#E07A5F]" />
              </div>
              <div className="text-center">
                <div className="font-semibold">실제 후기</div>
                <div className="text-sm text-muted-foreground">공개 이용 후기 확인</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
