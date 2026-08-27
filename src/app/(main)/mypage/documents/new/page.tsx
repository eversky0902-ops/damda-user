import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createDocumentDraftAction } from "@/app/actions/documentActions";
import { DOCUMENT_TYPES, isDocumentType } from "@/lib/documents";

export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ reservation?: string; type?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!params.reservation) redirect("/mypage/reservations");
  const { data: reservation } = await supabase.from("reservations").select("id,reservation_number,reserved_date,daycare_id,products:product_id(name)").eq("id", params.reservation).eq("daycare_id", user.id).maybeSingle();
  if (!reservation) redirect("/mypage/reservations");
  const selectedType = params.type && isDocumentType(params.type) ? params.type : "quotation";

  return <main className="mx-auto max-w-2xl px-4 py-10"><Link href={`/mypage/reservations/${reservation.id}`} className="text-sm text-gray-500 hover:text-gray-900">← 예약 상세로</Link><div className="mt-4 rounded-2xl border bg-white p-6"><h1 className="text-2xl font-bold">예약 기반 행정 문서 만들기</h1><p className="mt-2 text-sm text-gray-600">예약번호 {reservation.reservation_number}의 현재 데이터를 불러와 수정 가능한 초안을 생성합니다.</p><form action={createDocumentDraftAction} className="mt-6 space-y-4"><input type="hidden" name="reservationId" value={reservation.id} /><label className="block text-sm font-semibold">문서 종류<select name="documentType" defaultValue={selectedType} className="mt-2 w-full rounded-lg border px-3 py-3 font-normal">{Object.entries(DOCUMENT_TYPES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button className="w-full rounded-lg bg-damda-yellow px-4 py-3 font-bold text-gray-950">예약 데이터로 초안 생성</button></form></div></main>;
}
