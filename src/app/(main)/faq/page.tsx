import { HelpCircle } from "lucide-react";
import { getFAQs, groupFAQsByCategory } from "@/services/contentService";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata = {
  title: "자주 묻는 질문 | 담다",
  description: "담다 서비스 이용에 관한 자주 묻는 질문을 확인하세요.",
};

const CATEGORY_ORDER = ["usage", "service", "reservation", "payment", "refund", "member", "etc", "이용안내", "서비스", "예약/결제", "결제", "환불", "회원", "기타"];

const CATEGORY_LABELS: Record<string, string> = {
  usage: "이용안내",
  service: "서비스",
  reservation: "예약/결제",
  payment: "결제",
  refund: "환불",
  member: "회원",
  etc: "기타",
  // 이미 한글인 경우
  "이용안내": "이용안내",
  "서비스": "서비스",
  "예약/결제": "예약/결제",
  "결제": "결제",
  "환불": "환불",
  "회원": "회원",
  "기타": "기타",
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
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="px-4 py-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">자주 묻는 질문</h1>
          <p className="text-sm text-gray-500 mt-1">궁금한 점을 빠르게 찾아보세요.</p>
        </div>

        {faqs.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            {sortedCategories.map((category, categoryIndex) => {
              const categoryFAQs = groupedFAQs.get(category) || [];
              return (
                <div key={category} className={categoryIndex !== sortedCategories.length - 1 ? "border-b border-gray-200" : ""}>
                  <div className="px-4 py-3 bg-gray-50">
                    <span className="text-sm font-medium text-gray-700">{CATEGORY_LABELS[category] || category}</span>
                    <span className="text-sm text-gray-400 ml-2">{categoryFAQs.length}</span>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    {categoryFAQs.map((faq, index) => (
                      <AccordionItem
                        key={faq.id}
                        value={faq.id}
                        className={index !== categoryFAQs.length - 1 ? "border-b border-gray-100" : ""}
                      >
                        <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-gray-50 text-left">
                          <span className="text-sm text-gray-900">{faq.question}</span>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                            {faq.answer}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-4 py-16 text-center">
      <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">등록된 FAQ가 없습니다.</p>
    </div>
  );
}
