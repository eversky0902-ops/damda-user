"use client";

import Link from "next/link";
import { CheckCircle, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignupCompletePage() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle className="h-10 w-10 text-primary" />
      </div>

      <h1 className="mb-2 text-2xl font-bold">가입 신청이 완료되었습니다</h1>
      <p className="mb-8 text-muted-foreground">
        담당자 확인 후 승인이 완료되면
        <br />
        서비스를 이용하실 수 있습니다.
      </p>

      <div className="mb-8 w-full rounded-lg border bg-muted/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div className="text-left">
            <p className="font-medium">승인 대기중</p>
            <p className="text-sm text-muted-foreground">
              영업일 기준 1~2일 내에 승인됩니다
            </p>
          </div>
        </div>
      </div>

      <Button asChild className="w-full">
        <Link href="/">
          홈으로 돌아가기
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>

      <p className="mt-6 text-sm text-muted-foreground">
        문의사항이 있으시면{" "}
        <a href="mailto:support@damda.com" className="text-primary hover:underline">
          support@damda.com
        </a>
        으로 연락해주세요.
      </p>
    </div>
  );
}
