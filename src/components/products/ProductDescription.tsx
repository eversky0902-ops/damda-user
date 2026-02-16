"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductDescriptionProps {
  description: string | null;
  address?: string | null;
  addressDetail?: string | null;
}

export function ProductDescription({ description, address, addressDetail }: ProductDescriptionProps) {
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
            "legal-content text-sm text-gray-700 leading-relaxed max-w-none overflow-hidden transition-all [&_img]:w-full [&_img]:h-auto [&_img]:rounded-lg [&>p]:mb-4 [&>p]:leading-relaxed [&>h1]:text-lg [&>h1]:font-bold [&>h1]:text-gray-900 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:text-base [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-6 [&>h2]:mb-3 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:text-gray-900 [&>h3]:mt-5 [&>h3]:mb-2 [&>ul]:my-3 [&>ul]:pl-5 [&>ul]:list-disc [&>ol]:my-3 [&>ol]:pl-5 [&>ol]:list-decimal [&>li]:mb-1 [&>br]:block [&>br]:content-[''] [&>br]:mb-4",
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
          <p className="text-gray-600">
            {address}
            {addressDetail && ` ${addressDetail}`}
          </p>
        </div>
      )}
    </div>
  );
}
