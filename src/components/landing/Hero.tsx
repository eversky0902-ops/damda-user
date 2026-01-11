"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Star, Shield, MapPin } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-b from-primary/5 via-white to-white pt-20">
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
            보육 기관 전용 체험 플랫폼
          </div>

          {/* Main heading */}
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            현장체험,
            <br />
            <span className="text-primary">담다</span>에서 예약하세요
          </h1>

          {/* Subtitle */}
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            검증된 체험학습 업체와 어린이집 맞춤 프로그램을
            <br className="hidden sm:block" />
            한 곳에서 검색하고 간편하게 예약하세요
          </p>

          {/* CTA buttons */}
          <div className="mb-12 flex flex-col gap-4 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="group h-12 gap-2 rounded-full px-8 text-base font-semibold shadow-lg shadow-primary/20"
            >
              <Link href="/signup">
                가입 신청하기
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-12 gap-2 rounded-full border-2 px-8 text-base font-semibold"
            >
              <Link href="#products">
                <Play className="h-4 w-4 fill-current" />
                프로그램 둘러보기
              </Link>
            </Button>
          </div>

          {/* Key benefits */}
          <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-semibold">검증된 업체</div>
                <div className="text-sm text-muted-foreground">안전 인증 완료</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7BAE7F]/10">
                <MapPin className="h-6 w-6 text-[#7BAE7F]" />
              </div>
              <div className="text-center">
                <div className="font-semibold">지역별 검색</div>
                <div className="text-sm text-muted-foreground">가까운 체험처</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E07A5F]/10">
                <Star className="h-6 w-6 text-[#E07A5F]" />
              </div>
              <div className="text-center">
                <div className="font-semibold">실제 후기</div>
                <div className="text-sm text-muted-foreground">어린이집 리뷰</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
