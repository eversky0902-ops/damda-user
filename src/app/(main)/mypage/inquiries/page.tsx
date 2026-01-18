"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

interface Inquiry {
  id: string;
  category: string;
  title: string;
  content: string;
  status: "pending" | "answered";
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "예약/결제": "bg-blue-100 text-blue-800",
  "환불": "bg-red-100 text-red-800",
  "이용 문의": "bg-green-100 text-green-800",
  "기타": "bg-gray-100 text-gray-800",
};

export default function InquiriesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInquiries = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .eq("daycare_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching inquiries:", error);
      } else {
        setInquiries(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch inquiries:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchInquiries();
    }
  }, [authLoading, fetchInquiries]);

  if (authLoading || isLoading) {
    return <InquiriesSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">1:1 문의</h1>
        </div>
        <div className="text-center py-16 bg-white rounded-xl">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            로그인이 필요합니다
          </h3>
          <Button asChild className="bg-damda-yellow hover:bg-damda-yellow-dark">
            <Link href="/login">로그인하기</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">1:1 문의</h1>
        <Button asChild className="bg-damda-yellow hover:bg-damda-yellow-dark">
          <Link href="/mypage/inquiries/new">
            <Plus className="w-4 h-4 mr-2" />
            문의하기
          </Link>
        </Button>
      </div>

      {inquiries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} />
          ))}
        </div>
      )}
    </div>
  );
}

function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAnswered = inquiry.status === "answered";

  return (
    <Card>
      <CardContent className="p-0">
        {/* 문의 헤더 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 sm:p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* 카테고리 & 상태 */}
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  className={
                    CATEGORY_COLORS[inquiry.category] || CATEGORY_COLORS["기타"]
                  }
                >
                  {inquiry.category}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    isAnswered
                      ? "border-green-500 text-green-600"
                      : "border-yellow-500 text-yellow-600"
                  }
                >
                  {isAnswered ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      답변완료
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 mr-1" />
                      답변대기
                    </>
                  )}
                </Badge>
              </div>

              {/* 제목 */}
              <h3 className="font-medium text-gray-900 mb-1">{inquiry.title}</h3>

              {/* 날짜 */}
              <p className="text-xs text-gray-500">
                {format(parseISO(inquiry.created_at), "yyyy.MM.dd HH:mm", {
                  locale: ko,
                })}
              </p>
            </div>

            <ChevronRight
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </div>
        </button>

        {/* 문의 내용 */}
        {isExpanded && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-100">
            {/* 문의 내용 */}
            <div className="pt-4">
              <p className="text-sm font-medium text-gray-500 mb-2">문의 내용</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {inquiry.content}
              </p>
            </div>

            {/* 답변 */}
            {inquiry.answer && (
              <div className="mt-4">
                <p className="text-sm font-medium text-damda-yellow-dark mb-2 flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  담다 답변
                  {inquiry.answered_at && (
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      {format(parseISO(inquiry.answered_at), "yyyy.MM.dd HH:mm", {
                        locale: ko,
                      })}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-damda-yellow-light p-4 rounded-lg">
                  {inquiry.answer}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-white rounded-xl">
      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">문의 내역이 없습니다</h3>
      <p className="text-gray-500 mb-6">궁금한 점이 있으시면 문의해주세요.</p>
      <Button asChild className="bg-damda-yellow hover:bg-damda-yellow-dark">
        <Link href="/mypage/inquiries/new">
          <Plus className="w-4 h-4 mr-2" />
          문의하기
        </Link>
      </Button>
    </div>
  );
}

function InquiriesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
