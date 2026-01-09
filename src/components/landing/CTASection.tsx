"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center md:px-16">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            우리 어린이집도 담다와 함께하세요
          </h2>
          <p className="mb-8 text-lg text-white/80">
            국공립 어린이집이라면 지금 바로 가입 신청하세요
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="group h-12 gap-2 rounded-full bg-white px-8 text-base font-semibold text-primary hover:bg-white/90"
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
              className="h-12 rounded-full border-2 border-white/30 bg-transparent px-8 text-base font-semibold text-white hover:bg-white/10"
            >
              <Link href="/partner">입점문의하기</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
