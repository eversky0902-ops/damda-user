import type { Metadata } from "next";
import Link from "next/link";
import { FileText, HeartHandshake, MailCheck, MapPinned, ReceiptText, ShieldCheck } from "lucide-react";
import { FREE_FORM_DEFINITIONS, type FreeFormType } from "@/lib/free-forms";

export const metadata: Metadata = {
  title: "어린이집 무료 행정서류 양식",
  description: "견적서, 대금명세서, 견학지 안내서, 안전교육지, 부모교육지, 가정통신문을 로그인 없이 작성하고 Word 또는 PDF로 내려받으세요.",
  alternates: { canonical: "/free-forms" },
  openGraph: {
    url: "/free-forms",
    title: "어린이집 무료 행정서류 양식 | 담다",
    description: "어린이집 현장에서 바로 사용할 수 있는 행정서류 6종을 무료로 작성하고 내려받으세요.",
  },
};

const ICONS = {
  quotation: FileText,
  "payment-statement": ReceiptText,
  "venue-guide": MapPinned,
  "safety-education": ShieldCheck,
  "parent-education": HeartHandshake,
  "family-letter": MailCheck,
} satisfies Record<FreeFormType, typeof FileText>;

const ACCENTS = {
  yellow: "border-amber-200 bg-amber-50 text-amber-800 group-hover:border-amber-300",
  teal: "border-teal-200 bg-teal-50 text-teal-800 group-hover:border-teal-300",
  blue: "border-blue-200 bg-blue-50 text-blue-800 group-hover:border-blue-300",
  rose: "border-rose-200 bg-rose-50 text-rose-800 group-hover:border-rose-300",
  violet: "border-violet-200 bg-violet-50 text-violet-800 group-hover:border-violet-300",
  green: "border-green-200 bg-green-50 text-green-800 group-hover:border-green-300",
};

export default async function FreeFormsPage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b bg-gradient-to-br from-amber-50 via-white to-teal-50 px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="mt-5 text-3xl font-black tracking-tight text-gray-950 sm:text-5xl">어린이집 행정서류,<br className="sm:hidden" /> 작성하고 바로 내려받으세요</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">현장체험 준비에 필요한 6종 양식을 공개합니다.<br />브라우저에서 내용을 작성한 뒤 Word·한글 호환 문서로 내려받거나 PDF로 저장할 수 있습니다.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FREE_FORM_DEFINITIONS.map((definition, index) => {
            const Icon = ICONS[definition.type];
            return (
              <Link key={definition.type} href={`/free-forms/${definition.type}`} className="group flex min-h-64 flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${ACCENTS[definition.accent]}`}><Icon className="h-6 w-6" /></span>
                  <span className="text-xs font-black text-gray-300">0{index + 1}</span>
                </div>
                <h2 className="mt-5 text-xl font-black text-gray-950">{definition.title}</h2>
                <p className="mt-2 flex-1 whitespace-pre-line text-sm leading-6 text-gray-600">{definition.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">무료로 작성하기 <span aria-hidden>→</span></span>
              </Link>
            );
          })}
        </div>

        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-black text-gray-950">이용 전 확인해 주세요</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-gray-600 sm:grid-cols-2">
            <li>• 양식은 자유롭게 수정해 어린이집 실정에 맞게 사용할 수 있습니다.</li>
            <li>• 입력 내용은 담다 서버에 저장하거나 전송하지 않습니다.</li>
            <li>• 법정 교육기록으로 사용할 때는 해당 연도 기준과 기관 지침을 확인하세요.</li>
            <li>• 대금명세서는 세금계산서나 현금영수증을 대신하지 않습니다.</li>
          </ul>
        </section>
      </section>
    </div>
  );
}
