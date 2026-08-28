import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FreeFormEditor } from "@/components/free-forms";
import { FREE_FORM_DEFINITION_BY_TYPE, FREE_FORM_TYPES, isFreeFormType } from "@/lib/free-forms";

type PageProps = { params: Promise<{ type: string }> };

export function generateStaticParams() {
  return FREE_FORM_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type } = await params;
  if (!isFreeFormType(type)) return {};
  const definition = FREE_FORM_DEFINITION_BY_TYPE[type];
  return {
    title: `${definition.title} 무료 양식`,
    description: `${definition.description} 로그인 없이 작성하고 Word 또는 PDF로 내려받을 수 있습니다.`,
    alternates: { canonical: `/free-forms/${type}` },
  };
}

export default async function FreeFormDetailPage({ params }: PageProps) {
  const { type } = await params;
  if (!isFreeFormType(type)) return notFound();
  const definition = FREE_FORM_DEFINITION_BY_TYPE[type];

  return (
    <div>
      <div className="border-b bg-white px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href="/free-forms" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-950"><ChevronLeft className="h-4 w-4" />무료 양식 목록</Link>
          <p className="truncate text-sm font-bold text-gray-900">{definition.shortTitle}</p>
        </div>
      </div>
      <FreeFormEditor type={type} />
    </div>
  );
}
