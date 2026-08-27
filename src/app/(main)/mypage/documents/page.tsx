import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_TYPES, isDocumentType } from "@/lib/documents";

type DocumentListItem = {
  id: string;
  document_number: string;
  document_type: string;
  status: "draft" | "issued" | "archived";
  title: string;
  created_at: string;
  issued_at: string | null;
};

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/mypage/documents");

  // generated_documents는 운영 마이그레이션으로 생성되며 아직 생성 타입에는 포함되지 않습니다.
  const { data } = await supabase
    .from("generated_documents")
    .select("id,document_number,document_type,status,title,created_at,issued_at")
    .eq("daycare_id", user.id)
    .order("created_at", { ascending: false });
  const documents = (data || []) as DocumentListItem[];

  return (
    <div className="px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-950">행정 문서</h1>
      <p className="mt-2 text-sm text-gray-600">예약 상세에서 견적서와 안내문 등 7종 문서를 만들 수 있습니다.</p>
      {documents.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 px-6 py-14 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-medium text-gray-800">생성한 문서가 없습니다.</p>
          <Link href="/mypage/reservations" className="mt-4 inline-flex rounded-lg bg-damda-yellow px-4 py-2 text-sm font-bold text-gray-950">예약 내역에서 만들기</Link>
        </div>
      ) : (
        <div className="mt-6 divide-y rounded-2xl border bg-white">
          {documents.map((document) => (
            <Link key={document.id} href={`/mypage/documents/${document.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{isDocumentType(document.document_type) ? DOCUMENT_TYPES[document.document_type] : document.title}</p>
                <p className="mt-1 font-mono text-xs text-gray-500">{document.document_number}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${document.status === "issued" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{document.status === "issued" ? "발행 완료" : "초안"}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
