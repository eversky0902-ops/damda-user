"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { FileText } from "lucide-react";

// 법적 문서 카테고리 타입
export type LegalDocumentCategory =
  | "terms"
  | "privacy"
  | "refund-policy"
  | "reservation-guide";

// 법적 문서 타입 (클라이언트에서 사용)
export interface LegalDocument {
  id: string;
  category: LegalDocumentCategory;
  title: string;
  content: string;
  version: number;
  is_visible: boolean;
  created_at: string;
}

// 법적 문서 카테고리 라벨
const LEGAL_DOCUMENT_CATEGORY_LABEL: Record<LegalDocumentCategory, string> = {
  terms: "이용약관",
  privacy: "개인정보처리방침",
  "refund-policy": "환불정책",
  "reservation-guide": "예약안내",
};

interface LegalDocumentViewerProps {
  category: LegalDocumentCategory;
  documents: LegalDocument[];
  currentDocument: LegalDocument | null;
}

export function LegalDocumentViewer({
  category,
  documents,
  currentDocument,
}: LegalDocumentViewerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryLabel = LEGAL_DOCUMENT_CATEGORY_LABEL[category];

  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId) {
      router.push(`?version=${selectedId}`);
    } else {
      router.push(`/${category === "refund-policy" || category === "reservation-guide" ? category : category}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="px-4 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{categoryLabel}</h1>
              {currentDocument && (
                <p className="text-sm text-gray-500 mt-1">{currentDocument.title}</p>
              )}
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <select
                id="version-select"
                value={currentDocument?.id || ""}
                onChange={handleVersionChange}
                disabled={documents.length === 0}
                className="text-sm border border-gray-300 rounded-md pl-3 pr-10 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-damda-yellow disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer appearance-none bg-no-repeat bg-[length:16px_16px] bg-[position:right_0.75rem_center] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]"
              >
                {documents.length === 0 ? (
                  <option value="">버전 없음</option>
                ) : (
                  documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {format(new Date(doc.created_at), "yyyy.MM.dd", { locale: ko })}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          {currentDocument && (
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span>v{currentDocument.version}</span>
              <span>시행일: {format(new Date(currentDocument.created_at), "yyyy.MM.dd", { locale: ko })}</span>
            </div>
          )}
        </div>

        {/* 내용 */}
        {currentDocument ? (
          <div className="px-4 py-6">
            <div
              className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:mt-6 prose-headings:mb-3 prose-p:text-gray-700 prose-p:mb-4 prose-p:leading-relaxed prose-li:text-gray-700 prose-ul:my-3 prose-ol:my-3"
              dangerouslySetInnerHTML={{ __html: currentDocument.content }}
            />
          </div>
        ) : (
          <EmptyState category={categoryLabel} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ category }: { category: string }) {
  return (
    <div className="px-4 py-16 text-center">
      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">등록된 {category}이(가) 없습니다.</p>
    </div>
  );
}
