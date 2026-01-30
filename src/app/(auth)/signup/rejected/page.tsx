"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function SignupRejectedPage() {
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRejectionReason() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from("daycares")
            .select("rejection_reason")
            .eq("id", user.id)
            .single();

          if (data?.rejection_reason) {
            setRejectionReason(data.rejection_reason);
          }
        }
      } catch (error) {
        console.error("Failed to fetch rejection reason:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRejectionReason();
  }, []);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <XCircle className="h-10 w-10 text-red-500" />
      </div>

      <h1 className="mb-2 text-2xl font-bold">승인이 거절되었습니다</h1>
      <p className="mb-8 text-muted-foreground">
        가입 신청이 승인되지 않았습니다.
        <br />
        아래 사유를 확인해주세요.
      </p>

      {!isLoading && rejectionReason && (
        <div className="mb-8 w-full rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="mb-2 text-sm font-medium text-red-700">거절 사유</p>
          <p className="text-left text-red-600">{rejectionReason}</p>
        </div>
      )}

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
