import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_TYPES, isDocumentType } from "@/lib/documents";
import { issueDocumentAction, saveDocumentDraftAction } from "@/app/actions/documentActions";
import { PrintDocumentButton } from "@/components/documents/PrintDocumentButton";

type JsonObject = Record<string, unknown>;
type GeneratedDocument = {
  id: string;
  document_number: string;
  document_type: string;
  status: "draft" | "issued" | "archived";
  title: string;
  reservation_snapshot: JsonObject;
  publisher_snapshot: JsonObject;
  editable_content: JsonObject;
  created_at: string;
  issued_at: string | null;
};

const text = (object: JsonObject, key: string) => typeof object[key] === "string" ? object[key] as string : "";
const number = (object: JsonObject, key: string) => typeof object[key] === "number" ? object[key] as number : 0;
const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(value)) : "-";

const editableFields = [
  ["className", "반/학급"], ["departureTime", "출발 시간"], ["arrivalTime", "도착 예정 시간"],
  ["clothing", "복장 안내"], ["meal", "식사 안내"], ["transportation", "교통 안내"],
  ["emergencyContact", "비상 연락처"], ["teacherNotes", "교사 안내사항"], ["guardianNotes", "보호자 안내사항"],
  ["paymentTerms", "결제 조건"], ["validUntil", "유효 기간"], ["educationPurpose", "교육 목적"],
  ["educationAudience", "교육 대상"], ["educationContent", "교육 내용"], ["practiceMethod", "실천 방법"],
  ["checklist", "준비 체크리스트"], ["notes", "기타 메모"],
] as const;

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/mypage/documents/${id}`);
  const { data } = await supabase.from("generated_documents").select("*").eq("id", id).eq("daycare_id", user.id).maybeSingle();
  if (!data) notFound();
  const document = data as GeneratedDocument;
  const snapshot = document.reservation_snapshot || {};
  const publisher = document.publisher_snapshot || {};
  const content = document.editable_content || {};
  const daycare = (snapshot.daycare && typeof snapshot.daycare === "object" ? snapshot.daycare : {}) as JsonObject;
  const provider = (snapshot.provider && typeof snapshot.provider === "object" ? snapshot.provider : {}) as JsonObject;
  const payment = (snapshot.payment && typeof snapshot.payment === "object" ? snapshot.payment : {}) as JsonObject;
  const optionItems = Array.isArray(snapshot.optionItems) ? snapshot.optionItems.filter((item): item is JsonObject => Boolean(item) && typeof item === "object") : [];
  const refunds = Array.isArray(snapshot.refunds) ? snapshot.refunds.filter((item): item is JsonObject => Boolean(item) && typeof item === "object") : [];
  const typeLabel = isDocumentType(document.document_type) ? DOCUMENT_TYPES[document.document_type] : document.title;
  const isDraft = document.status === "draft";

  return (
    <div className="document-page mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/mypage/documents" className="text-sm text-gray-500 hover:text-gray-900">← 문서 목록</Link>
        <div className="flex gap-2"><PrintDocumentButton /></div>
      </div>
      <form className="space-y-5" action={saveDocumentDraftAction}>
        <input type="hidden" name="id" value={document.id} />
        <article className="document-sheet mx-auto min-h-[297mm] max-w-[210mm] bg-white p-6 shadow-sm sm:p-10 print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
          <header className="border-b-2 border-gray-950 pb-5 text-center">
            <p className="text-sm font-semibold tracking-[0.2em] text-gray-500">DAMDA DOCUMENT</p>
            <h1 className="mt-2 text-3xl font-black text-gray-950">{text(content, "title") || typeLabel}</h1>
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-gray-600">
              <span>문서번호 {document.document_number}</span><span>작성일 {formatDate(document.created_at)}</span><span>상태 {isDraft ? "초안" : "발행 완료"}</span>
            </div>
          </header>

          {document.document_type === "payment_statement" && <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">본 문서는 세금계산서가 아닌 거래·결제 내역 문서입니다.</p>}

          <section className="mt-7 grid gap-4 sm:grid-cols-3">
            <Party title="발행자" name={text(publisher, "company_name")} lines={[`사업자번호 ${text(publisher, "business_number")}`, `대표 ${text(publisher, "representative")}`, text(publisher, "address"), text(publisher, "phone")]} />
            <Party title="서비스 제공자" name={text(provider, "name") || text(snapshot, "venueName")} lines={[`사업자번호 ${text(provider, "business_number")}`, `대표 ${text(provider, "representative")}`, text(snapshot, "venueAddress"), text(provider, "contact_phone")]} />
            <Party title="이용 기관" name={text(daycare, "name")} lines={[`인가번호 ${text(daycare, "license_number")}`, `대표 ${text(daycare, "representative")}`, [text(daycare, "address"), text(daycare, "address_detail")].filter(Boolean).join(" "), text(daycare, "contact_phone")]} />
          </section>

          <section className="mt-7">
            <h2 className="text-base font-bold text-gray-950">예약 내역</h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-300">
              <table className="w-full text-sm"><tbody className="divide-y divide-gray-200">
                <Row label="예약번호" value={text(snapshot, "reservationNumber")} /><Row label="상품/체험" value={text(snapshot, "productName")} />
                <Row label="이용 일시" value={[text(snapshot, "reservedDate"), text(snapshot, "reservedTime")].filter(Boolean).join(" ")} /><Row label="이용 인원" value={`${number(snapshot, "participantCount")}명`} />
                <Row label="이용 금액" value={won(number(snapshot, "totalAmount"))} strong />
              </tbody></table>
            </div>
          </section>

          {(document.document_type === "quotation" || document.document_type === "payment_statement") && <section className="mt-7">
            <h2 className="text-base font-bold text-gray-950">금액 명세</h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-300">
              <table className="w-full text-sm"><tbody className="divide-y divide-gray-200">
                <Row label="기본 단가" value={won(number(snapshot, "unitPrice"))} />
                <Row label="인원별 금액" value={`${won(number(snapshot, "unitPrice"))} × ${number(snapshot, "participantCount")}명 = ${won(number(snapshot, "baseAmount"))}`} />
                {optionItems.map((item, index) => <Row key={`${text(item, "name")}-${index}`} label={`옵션 · ${text(item, "name") || index + 1}`} value={`${number(item, "quantity")}개 / ${won(number(item, "amount"))}`} />)}
                <Row label="옵션 합계" value={won(number(snapshot, "optionAmount"))} /><Row label="할인 금액" value={`-${won(number(snapshot, "discountAmount"))}`} />
                <Row label="공급가액" value={won(number(snapshot, "supplyAmount"))} /><Row label="세액" value={number(snapshot, "taxAmount") > 0 ? won(number(snapshot, "taxAmount")) : "비과세/미적용"} />
                <Row label={document.document_type === "quotation" ? "최종 견적 금액" : "총 청구 금액"} value={won(number(snapshot, "totalAmount"))} strong />
              </tbody></table>
            </div>
            {text(snapshot, "refundNotice") && <p className="mt-3 whitespace-pre-line rounded-lg bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600"><strong className="text-gray-800">취소·환불 안내</strong><br />{text(snapshot, "refundNotice")}</p>}
          </section>}

          {document.document_type === "payment_statement" && <section className="mt-7">
            <h2 className="text-base font-bold text-gray-950">결제 내역</h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-300"><table className="w-full text-sm"><tbody className="divide-y divide-gray-200">
              <Row label="PG 거래번호" value={text(payment, "pg_tid")} /><Row label="결제 금액" value={won(number(payment, "amount"))} />
              <Row label="미결제 금액" value={won(Math.max(0, number(snapshot, "totalAmount") - number(payment, "amount")))} />
              <Row label="결제 상태" value={text(payment, "status") || "결제 정보 없음"} /><Row label="결제 수단" value={text(payment, "payment_method")} /><Row label="결제일" value={formatDate(text(payment, "paid_at") || null)} />
              {refunds.map((refund, index) => <Row key={`${text(refund, "status")}-${index}`} label={`취소·환불 ${index + 1}`} value={`${won(number(refund, "refund_amount"))} / ${text(refund, "status")} / ${formatDate(text(refund, "refunded_at") || null)}`} />)}
            </tbody></table></div>
          </section>}

          <section className="mt-7 print:hidden">
            <h2 className="text-base font-bold text-gray-950">문서별 추가 내용</h2>
            <p className="mt-1 text-xs text-gray-500">초안 상태에서만 수정할 수 있으며, 발행 후 예약·발행자 스냅샷과 내용은 변경되지 않습니다.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {editableFields.map(([name, label]) => <label key={name} className="text-sm font-semibold text-gray-700">{label}<textarea name={name} defaultValue={text(content, name)} disabled={!isDraft} rows={name === "educationContent" || name === "notes" ? 4 : 2} className="mt-1 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 font-normal disabled:bg-gray-50" /></label>)}
              <input type="hidden" name="title" value={text(content, "title") || typeLabel} />
            </div>
          </section>

          <section className="mt-7 hidden border-t border-gray-300 pt-5 print:block">
            {editableFields.filter(([name]) => text(content, name)).map(([name, label]) => <div key={name} className="mb-3"><h3 className="text-sm font-bold">{label}</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-700">{text(content, name)}</p></div>)}
          </section>

          <footer className="mt-10 border-t border-gray-300 pt-5 text-xs text-gray-500">
            <p>이 문서는 예약 시점의 정보로 생성되며 발행 후 스냅샷으로 보존됩니다.</p>
            {document.issued_at && <p className="mt-1">발행일 {formatDate(document.issued_at)}</p>}
          </footer>
        </article>
        {isDraft && <div className="sticky bottom-3 flex justify-end gap-2 rounded-xl border bg-white/95 p-3 shadow-lg print:hidden"><button type="submit" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold">초안 저장</button><button type="submit" formAction={issueDocumentAction} className="rounded-lg bg-damda-yellow px-4 py-2 text-sm font-bold text-gray-950">저장하고 발행</button></div>}
      </form>
    </div>
  );
}

function Party({ title, name, lines }: { title: string; name: string; lines: string[] }) {
  return <div className="rounded-lg border border-gray-300 p-4"><p className="text-xs font-bold text-gray-500">{title}</p><p className="mt-2 font-bold text-gray-950">{name || "-"}</p>{lines.filter((line) => line && !line.endsWith(" ")).map((line) => <p key={line} className="mt-1 break-words text-xs leading-5 text-gray-600">{line}</p>)}</div>;
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <tr><th className="w-32 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600">{label}</th><td className={`px-4 py-3 text-right ${strong ? "text-base font-black text-gray-950" : "text-gray-800"}`}>{value || "-"}</td></tr>;
}
