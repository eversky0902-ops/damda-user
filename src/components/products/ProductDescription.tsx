"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductDescriptionProps {
  description: string | null;
  address?: string | null;
}

export function ProductDescription({ description, address }: ProductDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 상세 설명 */}
      <div className="relative">
        <div
          className={cn(
            "prose prose-gray max-w-none overflow-hidden transition-all [&_img]:w-full [&_img]:h-auto [&_img]:rounded-lg",
            !isExpanded && "max-h-[400px]"
          )}
          dangerouslySetInnerHTML={{ __html: description }}
        />

        {/* 그라데이션 오버레이 */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>

      {/* 펼치기/접기 버튼 */}
      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="min-w-[160px]"
        >
          {isExpanded ? (
            <>
              접기
              <ChevronUp className="w-4 h-4 ml-1" />
            </>
          ) : (
            <>
              상세정보 더보기
              <ChevronDown className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>

      {/* 주소 정보 */}
      {address && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">체험 장소</h4>
          <p className="text-gray-600">{address}</p>
        </div>
      )}
    </div>
  );
}
