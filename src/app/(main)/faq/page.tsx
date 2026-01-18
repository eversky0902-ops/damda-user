import { HelpCircle, ChevronDown } from "lucide-react";
import { getFAQs, groupFAQsByCategory } from "@/services/contentService";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "자주 묻는 질문 | 담다",
  description: "담다 서비스 이용에 관한 자주 묻는 질문을 확인하세요.",
};

const CATEGORY_ORDER = ["이용안내", "예약/결제", "환불", "회원", "기타"];
const CATEGORY_COLORS: Record<string, string> = {
  "이용안내": "bg-blue-100 text-blue-800",
  "예약/결제": "bg-green-100 text-green-800",
  "환불": "bg-red-100 text-red-800",
  "회원": "bg-purple-100 text-purple-800",
  "기타": "bg-gray-100 text-gray-800",
};

export default async function FAQPage() {
  const faqs = await getFAQs();
  const groupedFAQs = groupFAQsByCategory(faqs);

  // 카테고리 정렬
  const sortedCategories = Array.from(groupedFAQs.keys()).sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-damda-yellow" />
            자주 묻는 질문
          </h1>
          <p className="text-gray-500 mt-1">궁금한 점을 빠르게 찾아보세요.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {faqs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {sortedCategories.map((category) => {
              const categoryFAQs = groupedFAQs.get(category) || [];
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={CATEGORY_COLORS[category] || CATEGORY_COLORS["기타"]}>
                      {category}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {categoryFAQs.length}개
                    </span>
                  </div>

                  <div className="bg-white rounded-xl overflow-hidden">
                    <Accordion type="single" collapsible className="w-full">
                      {categoryFAQs.map((faq, index) => (
                        <AccordionItem
                          key={faq.id}
                          value={faq.id}
                          className={index !== categoryFAQs.length - 1 ? "border-b" : ""}
                        >
                          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-gray-50">
                            <span className="text-left font-medium text-gray-900">
                              Q. {faq.question}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="px-5 pb-4">
                            <div className="bg-damda-yellow-light rounded-lg p-4 text-gray-700 whitespace-pre-wrap">
                              {faq.answer}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 추가 문의 안내 */}
        <div className="mt-12 text-center bg-white rounded-xl p-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            원하시는 답변을 찾지 못하셨나요?
          </h3>
          <p className="text-gray-500 mb-4">
            1:1 문의를 통해 궁금한 점을 문의해 주세요.
          </p>
          <a
            href="/mypage/inquiries/new"
            className="inline-flex items-center px-6 py-3 bg-damda-yellow hover:bg-damda-yellow-dark text-white rounded-lg font-medium transition-colors"
          >
            1:1 문의하기
          </a>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-white rounded-xl">
      <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 FAQ가 없습니다</h3>
    </div>
  );
}
