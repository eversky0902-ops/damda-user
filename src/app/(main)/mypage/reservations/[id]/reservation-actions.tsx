"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface ReservationActionsProps {
  reservationId: string;
  reservationNumber: string;
  canReview: boolean;
  canCancel: boolean;
  servicePhone: string;
  businessHours: string;
}

export function ReservationActions({
  reservationId,
  reservationNumber,
  canReview,
  canCancel,
  servicePhone,
  businessHours,
}: ReservationActionsProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryContent, setInquiryContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inquiryError, setInquiryError] = useState("");
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  const openInquiryModal = () => {
    setShowCancelModal(false);
    setInquiryError("");
    setInquirySubmitted(false);
    setShowInquiryModal(true);
  };

  const submitCancellationInquiry = async () => {
    const content = inquiryContent.trim();
    if (!content) {
      setInquiryError("취소 문의 내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setInquiryError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setInquiryError("로그인 정보를 확인하지 못했습니다. 다시 로그인해주세요.");
        return;
      }

      const { error } = await supabase.from("inquiries").insert({
        daycare_id: user.id,
        category: "refund",
        title: `예약 취소 문의 (${reservationNumber})`,
        content: `[예약번호: ${reservationNumber}]\n[예약 ID: ${reservationId}]\n\n${content}`,
      });
      if (error) throw error;

      setInquiryContent("");
      setInquirySubmitted(true);
    } catch (error) {
      console.error("Failed to submit cancellation inquiry:", error);
      setInquiryError("문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="px-4 py-6 space-y-3">
        {canReview && (
          <Button
            asChild
            className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900 font-medium"
          >
            <Link href={`/mypage/reviews/write?reservationId=${reservationId}`}>
              <MessageSquare className="w-5 h-5 mr-2" />
              리뷰 작성하기
            </Link>
          </Button>
        )}

        {canCancel && (
          <Button
            variant="outline"
            className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => setShowCancelModal(true)}
          >
            예약 취소하기
          </Button>
        )}

        <Button asChild variant="outline" className="w-full h-12">
          <Link href="/mypage/reservations">목록으로 돌아가기</Link>
        </Button>
      </div>

      {/* 취소 안내 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCancelModal(false)}
          />

          {/* 모달 */}
          <div className="relative bg-white rounded-2xl w-[90%] max-w-sm mx-4 overflow-hidden">
            {/* 닫기 버튼 */}
            <button
              onClick={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="px-6 pt-8 pb-6 text-center">
              <div className="w-14 h-14 bg-damda-yellow-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-7 h-7 text-damda-yellow-dark" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                예약 취소 안내
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                예약 취소는 고객센터를 통해<br />
                처리해 드리고 있습니다.
              </p>
              <p className="text-sm text-gray-500 mt-3">
                운영시간: {businessHours}
              </p>
            </div>

            <div className="px-6 pb-6 space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">고객센터 전화번호</p>
                <p className="text-2xl font-bold text-gray-900 tracking-wide select-all">
                  {servicePhone}
                </p>
              </div>
              <Button
                className="w-full h-11 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900 font-medium"
                onClick={openInquiryModal}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                취소 문의 남기기
              </Button>
              <Button
                variant="ghost"
                className="w-full h-10 text-gray-500"
                onClick={() => setShowCancelModal(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {showInquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isSubmitting && setShowInquiryModal(false)} />
          <div className="relative bg-white rounded-2xl w-[90%] max-w-sm mx-4 overflow-hidden">
            <button
              onClick={() => !isSubmitting && setShowInquiryModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              disabled={isSubmitting}
              aria-label="취소 문의 창 닫기"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="px-6 pt-7 pb-4">
              <h3 className="text-lg font-bold text-gray-900">예약 취소 문의</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                문의 내용은 어드민 1:1 문의로 전달됩니다. 문의 접수만 진행되며 예약은 자동으로 취소되지 않습니다.
              </p>
              <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                예약번호: <span className="font-medium text-gray-700">{reservationNumber}</span>
              </p>
            </div>
            <div className="px-6 pb-6">
              {inquirySubmitted ? (
                <div className="space-y-4 text-center">
                  <p className="rounded-xl bg-green-50 px-4 py-5 text-sm leading-relaxed text-green-700">
                    취소 문의가 접수되었습니다. 답변은 마이페이지 1:1 문의에서 확인할 수 있습니다.
                  </p>
                  <Button className="w-full h-11 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900" onClick={() => setShowInquiryModal(false)}>확인</Button>
                </div>
              ) : (
                <>
                  <label htmlFor="cancellation-inquiry" className="mb-2 block text-sm font-medium text-gray-800">문의 내용</label>
                  <textarea
                    id="cancellation-inquiry"
                    value={inquiryContent}
                    onChange={(event) => setInquiryContent(event.target.value)}
                    placeholder="취소를 원하는 사유와 확인이 필요한 내용을 입력해주세요."
                    className="min-h-32 w-full resize-y rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-damda-yellow focus:ring-2 focus:ring-damda-yellow/20"
                    disabled={isSubmitting}
                    maxLength={2000}
                  />
                  {inquiryError && <p className="mt-2 text-xs text-red-600">{inquiryError}</p>}
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowInquiryModal(false)} disabled={isSubmitting}>취소</Button>
                    <Button className="flex-1 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900" onClick={submitCancellationInquiry} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "문의 접수"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
