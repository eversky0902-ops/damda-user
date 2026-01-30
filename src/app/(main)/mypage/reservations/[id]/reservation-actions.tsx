"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReservationActionsProps {
  reservationId: string;
  canReview: boolean;
  canCancel: boolean;
}

export function ReservationActions({
  reservationId,
  canReview,
  canCancel,
}: ReservationActionsProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);

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
                운영시간: 평일 09:00 ~ 18:00
              </p>
            </div>

            <div className="px-6 pb-6 space-y-2">
              <Button
                asChild
                className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900 font-medium"
              >
                <a href="tel:1588-0000">
                  <Phone className="w-5 h-5 mr-2" />
                  고객센터 전화하기
                </a>
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
    </>
  );
}
