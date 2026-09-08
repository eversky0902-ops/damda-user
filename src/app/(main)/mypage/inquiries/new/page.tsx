"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const CATEGORIES = [
  { value: "reservation", label: "예약 문의" }, { value: "payment", label: "결제 문의" },
  { value: "refund", label: "취소·환불 문의" }, { value: "product", label: "상품 문의" },
  { value: "member", label: "회원 문의" }, { value: "etc", label: "기타 문의" },
];

export default function NewInquiryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [category, setCategory] = useState("reservation");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login?redirect=/mypage/inquiries/new");
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) {
      setErrorMessage("제목과 문의 내용을 모두 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage("로그인 정보를 확인하지 못했습니다. 다시 로그인해주세요.");
        return;
      }
      const { error } = await supabase.from("inquiries").insert({ daycare_id: user.id, category, title: trimmedTitle, content: trimmedContent });
      if (error) throw error;
      router.replace("/mypage/inquiries");
    } catch (error) {
      console.error("Failed to create inquiry:", error);
      setErrorMessage("문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authLoading && !isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="1:1 문의 목록으로 돌아가기"><Link href="/mypage/inquiries"><ChevronLeft className="h-5 w-5" /></Link></Button>
        <h1 className="text-xl font-bold text-gray-900">1:1 문의 작성</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div>
          <label htmlFor="inquiry-category" className="mb-2 block text-sm font-medium text-gray-800">문의 유형</label>
          <select id="inquiry-category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-damda-yellow focus:ring-2 focus:ring-damda-yellow/30" disabled={isSubmitting}>
            {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="inquiry-title" className="mb-2 block text-sm font-medium text-gray-800">제목</label>
          <Input id="inquiry-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="문의 제목을 입력해주세요." maxLength={200} disabled={isSubmitting} />
        </div>
        <div>
          <label htmlFor="inquiry-content" className="mb-2 block text-sm font-medium text-gray-800">문의 내용</label>
          <Textarea id="inquiry-content" value={content} onChange={(event) => setContent(event.target.value)} placeholder="문의 내용을 자세히 입력해주세요." className="min-h-44 resize-y" maxLength={2000} disabled={isSubmitting} />
        </div>
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        <div className="flex gap-2 pt-1">
          <Button asChild type="button" variant="outline" className="flex-1" disabled={isSubmitting}><Link href="/mypage/inquiries">취소</Link></Button>
          <Button type="submit" className="flex-1 bg-damda-yellow text-gray-900 hover:bg-damda-yellow-dark" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "문의 접수"}</Button>
        </div>
      </form>
    </div>
  );
}
