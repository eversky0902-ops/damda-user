"use client";

import { useEffect, useState } from "react";
import { Download, FileCheck2, Info, Printer, RotateCcw, Sparkles, X } from "lucide-react";
import {
  buildFreeFormDocxBlob,
  buildFreeFormDocumentHtml,
  DAMDA_BUSINESS_SEAL_SRC,
  DAMDA_DOCUMENT_WATERMARK_SRC,
  FREE_FORM_DEFINITION_BY_TYPE,
  getFreeFormExampleValues,
  getFreeFormInitialValues,
  type FreeFormField,
  type FreeFormType,
  formatNumber,
} from "@/lib/free-forms";
import { FreeFormPreview } from "./FreeFormPreview";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart-store";

const inputClass = "mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-damda-yellow focus:ring-2 focus:ring-damda-yellow/20";

const paymentMethodLabel = (method: string | null | undefined) => ({
  card: "신용카드",
  credit_card: "신용카드",
  bank: "계좌이체",
  account_transfer: "계좌이체",
  virtual_account: "가상계좌",
  cash: "현금",
}[method || ""] || method || "");

const paymentStatusLabel = (status: string | null | undefined) => ({
  paid: "결제 완료",
  pending: "부분 결제",
  cancelled: "결제 취소",
  failed: "결제 취소",
}[status || ""] || status || "");

type ReservationChoice = {
  id: string;
  reservationNumber: string;
  reservedDate: string;
  reservedTime: string | null;
  participantCount: number;
  totalAmount: number;
  productName: string;
  unitPrice: number | null;
  payment: {
    payment_method: string | null;
    pg_tid: string | null;
    status: string | null;
    paid_at: string | null;
    amount: number | null;
  } | null;
  refundAmount: number;
};

function EditorField({ field, value, onChange }: { field: FreeFormField; value: string; onChange: (value: string) => void }) {
  const common = { id: field.name, name: field.name, value: field.kind === "number" ? formatNumber(value) : value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(field.kind === "number" ? event.target.value.replace(/[^0-9]/g, "") : event.target.value), className: inputClass };
  return (
    <label htmlFor={field.name} className={`block text-sm font-semibold text-gray-700 ${field.fullWidth ? "sm:col-span-2" : ""}`}>
      {field.label}
      {field.kind === "textarea" ? (
        <textarea {...common} rows={3} placeholder={field.placeholder} className={`${inputClass} resize-y`} />
      ) : field.kind === "select" ? (
        <select {...common}>
          <option value="">선택하세요</option>
          {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input {...common} type={field.kind === "number" ? "text" : (field.kind || "text")} min={field.kind === "number" ? 0 : undefined} step={field.kind === "number" ? 1 : undefined} placeholder={field.placeholder} inputMode={field.kind === "number" ? "numeric" : undefined} />
      )}
      {field.help && <span className="mt-1 block text-xs font-normal leading-5 text-gray-500">{field.help}</span>}
    </label>
  );
}

export function FreeFormEditor({ type }: { type: FreeFormType }) {
  const definition = FREE_FORM_DEFINITION_BY_TYPE[type];
  const [values, setValues] = useState(() => getFreeFormInitialValues(type));
  const [loadMessage, setLoadMessage] = useState("");
  const [reservationChoices, setReservationChoices] = useState<ReservationChoice[]>([]);
  const [isReservationPickerOpen, setIsReservationPickerOpen] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const cartItems = useCartStore((state) => state.items);

  const updateValue = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));

  const loadLoginInfo = async () => {
    if (!user || !isAuthenticated) {
      setLoadMessage("로그인 후 기관 정보를 불러올 수 있습니다.");
      return;
    }
    const { data, error } = await createClient().from("daycares").select("name,representative,contact_name,address,address_detail").eq("id", user.id).maybeSingle();
    if (error || !data) {
      setLoadMessage("등록된 기관 정보를 찾지 못했습니다.");
      return;
    }
    setValues((current) => type === "venue-guide" ? ({
      ...current,
      daycareName: data.name || "",
    }) : type === "safety-education" ? ({
      ...current,
      daycareName: data.name || "",
      instructor: data.contact_name || data.representative || "",
    }) : type === "parent-education" ? ({
      ...current,
      daycareName: data.name || "",
      contact: data.contact_name || data.representative || current.contact,
    }) : type === "family-letter" ? ({
      ...current,
      daycareName: data.name || "",
    }) : ({
      ...current,
      recipientName: data.name || "",
      recipientRepresentative: data.contact_name || data.representative || "",
      recipientAddress: [data.address, data.address_detail].filter(Boolean).join(" "),
    }));
    setLoadMessage("로그인한 기관 정보가 입력되었습니다.");
  };

  const openReservationPicker = async () => {
    if (!user || !isAuthenticated) {
      setLoadMessage("로그인 후 예약 내역을 불러올 수 있습니다.");
      return;
    }
    setIsLoadingReservations(true);
    const supabase = createClient();
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("id,reservation_number,product_id,reserved_date,reserved_time,participant_count,total_amount")
      .eq("daycare_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !reservations?.length) {
      setLoadMessage("불러올 예약 내역이 없습니다.");
      setIsLoadingReservations(false);
      return;
    }
    const reservationIds = reservations.map((reservation) => reservation.id);
    const productIds = Array.from(new Set(reservations.map((reservation) => reservation.product_id)));
    const [{ data: products }, { data: payments }, { data: refunds }] = await Promise.all([
      supabase.from("products").select("id,name,sale_price").in("id", productIds),
      supabase.from("payments").select("reservation_id,payment_method,pg_tid,status,paid_at,amount,created_at").in("reservation_id", reservationIds).order("created_at", { ascending: false }),
      supabase.from("refunds").select("reservation_id,refund_amount").in("reservation_id", reservationIds).eq("status", "completed"),
    ]);
    const productById = new Map((products || []).map((product) => [product.id, product]));
    const paymentByReservationId = new Map<string, NonNullable<typeof payments>[number]>();
    (payments || []).forEach((payment) => {
      if (!paymentByReservationId.has(payment.reservation_id)) paymentByReservationId.set(payment.reservation_id, payment);
    });
    const refundByReservationId = new Map<string, number>();
    (refunds || []).forEach((refund) => {
      refundByReservationId.set(refund.reservation_id, (refundByReservationId.get(refund.reservation_id) || 0) + Number(refund.refund_amount || 0));
    });
    setReservationChoices(reservations.map((reservation) => {
      const product = productById.get(reservation.product_id);
      return {
        id: reservation.id,
        reservationNumber: reservation.reservation_number,
        reservedDate: reservation.reserved_date,
        reservedTime: reservation.reserved_time,
        participantCount: reservation.participant_count,
        totalAmount: reservation.total_amount,
        productName: product?.name || "상품 정보 없음",
        unitPrice: product?.sale_price ?? null,
        payment: paymentByReservationId.get(reservation.id) || null,
        refundAmount: refundByReservationId.get(reservation.id) || 0,
      };
    }));
    setIsReservationPickerOpen(true);
    setIsLoadingReservations(false);
  };

  const loadReservation = (reservation: ReservationChoice) => {
    const unitPrice = reservation.unitPrice ? String(reservation.unitPrice) : reservation.participantCount ? String(Math.round(reservation.totalAmount / reservation.participantCount)) : "";
    setValues((current) => ({
      ...current,
      experienceName: reservation.productName || current.experienceName,
      experienceDate: reservation.reservedDate || current.experienceDate,
      participantCount: String(reservation.participantCount || ""),
      unitPrice,
      optionAmount: "0",
      ...(type === "payment-statement" ? reservation.payment ? {
        paymentDate: reservation.payment.paid_at?.slice(0, 10) || "",
        paymentMethod: paymentMethodLabel(reservation.payment.payment_method),
        transactionId: reservation.payment.pg_tid || "",
        paymentStatus: paymentStatusLabel(reservation.payment.status),
        refundAmount: String(reservation.refundAmount),
      } : {
        paymentDate: "",
        paymentMethod: "",
        transactionId: "",
        paymentStatus: "",
        refundAmount: "0",
      } : {}),
    }));
    setIsReservationPickerOpen(false);
    setLoadMessage(reservation.payment ? "선택한 예약 및 결제 정보가 입력되었습니다." : "선택한 예약 정보가 입력되었습니다. 결제 정보는 아직 없습니다.");
  };

  const loadCart = () => {
    const item = cartItems[0];
    if (!item) {
      setLoadMessage("장바구니에 담긴 상품이 없습니다.");
      return;
    }
    const optionAmount = (item.options || []).reduce((sum, option) => sum + option.price * option.quantity, 0);
    setValues((current) => ({
      ...current,
      experienceName: item.product.name,
      experienceDate: item.reservationDate?.slice(0, 10) || current.experienceDate,
      participantCount: String(item.participants || ""),
      unitPrice: String(item.product.sale_price || ""),
      optionAmount: String(optionAmount),
    }));
    setLoadMessage("장바구니 내역이 입력되었습니다.");
  };

  useEffect(() => {
    if (type === "venue-guide" && user && isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadLoginInfo();
    }
    // 로그인 정보는 인증 상태가 준비된 뒤 자동으로 반영합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, user?.id, isAuthenticated]);

  const downloadWord = async () => {
    const blob = await buildFreeFormDocxBlob(type, values);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${new Date().toISOString().slice(0, 10)}_${definition.downloadName}.docx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const printOrSavePdf = () => {
    // Open the document during the click event so browsers permit printing.
    // A hidden iframe can lose the user gesture and silently prevent printing.
    const printWindow = window.open("", "_blank", "popup,width=960,height=1200");
    if (!printWindow) {
      setLoadMessage("인쇄 창을 열 수 없습니다. 브라우저의 팝업 차단을 해제한 뒤 다시 시도해 주세요.");
      return;
    }

    let printed = false;
    const printWhenReady = () => {
      if (printed || printWindow.closed) return;
      printed = true;
      const images = Array.from(printWindow.document.images);
      void Promise.all(images.map((image) => image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })))
        .then(() => window.setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.focus();
            printWindow.print();
          }
        }, 150));
    };

    printWindow.document.open();
    printWindow.document.write(buildFreeFormDocumentHtml(type, values, {
      // The isolated document needs absolute asset URLs for images.
      sealImageSrc: new URL(DAMDA_BUSINESS_SEAL_SRC, window.location.origin).toString(),
      watermarkImageSrc: new URL(DAMDA_DOCUMENT_WATERMARK_SRC, window.location.origin).toString(),
    }));
    printWindow.document.close();
    printWindow.addEventListener("load", printWhenReady, { once: true });
    window.setTimeout(printWhenReady, 300);
  };

  const clearForm = () => {
    if (window.confirm("입력한 내용을 모두 비우고 빈 양식으로 바꿀까요?")) {
      setValues(getFreeFormInitialValues(type, true));
    }
  };

  return (
    <div className="document-page bg-slate-50" data-free-form-editor={type}>
      <div className="border-y border-teal-100 bg-teal-50 px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-7xl items-start gap-2 text-sm text-teal-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p><strong>로그인 없이 무료로 사용할 수 있습니다.</strong> 입력 내용은 서버에 저장되지 않습니다. Word·한글 호환 문서로 내려받거나 인쇄 창에서 PDF로 저장하세요.</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-6">
        <div className="space-y-5 print:hidden">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-damda-yellow-light p-2.5"><FileCheck2 className="h-5 w-5 text-damda-yellow-dark" /></span>
              <div><h2 className="text-xl font-black text-gray-950">{definition.title} 작성</h2><p className="mt-1 text-sm leading-6 text-gray-600">{definition.description}</p></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" onClick={() => setValues(getFreeFormExampleValues(type))} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100"><Sparkles className="h-4 w-4" />예시 불러오기</button>
              <button type="button" onClick={clearForm} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><RotateCcw className="h-4 w-4" />전체 비우기</button>
              <button type="button" onClick={() => void downloadWord()} className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-damda-yellow px-3 py-2 text-sm font-bold text-gray-950 hover:bg-damda-yellow-dark"><Download className="h-4 w-4" />Word 다운로드</button>
              <button type="button" onClick={printOrSavePdf} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-bold text-white hover:bg-gray-800"><Printer className="h-4 w-4" />인쇄·PDF</button>
            </div>
            {loadMessage && <p className="mt-3 text-xs font-medium text-teal-700" role="status">{loadMessage}</p>}
          </div>

          {definition.sections.map((section) => (
            <section key={section.title} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><h3 className="text-base font-bold text-gray-950">{section.title}</h3>{(["quotation", "payment-statement"].includes(type) && section.title === "수신 기관") && <button type="button" onClick={loadLoginInfo} className="whitespace-nowrap rounded-md border border-teal-200 px-2.5 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-50">로그인 정보 불러오기</button>}{type === "venue-guide" && section.title === "기본 정보" && <button type="button" onClick={loadLoginInfo} className="whitespace-nowrap rounded-md border border-teal-200 px-2.5 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-50">로그인 정보 불러오기</button>}{type === "safety-education" && section.title === "교육 개요" && <button type="button" onClick={loadLoginInfo} className="whitespace-nowrap rounded-md border border-teal-200 px-2.5 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-50">로그인 정보 불러오기</button>}{type === "parent-education" && section.title === "발행 정보" && <button type="button" onClick={loadLoginInfo} className="whitespace-nowrap rounded-md border border-teal-200 px-2.5 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-50">로그인 정보 불러오기</button>}{type === "family-letter" && section.title === "안내 기본 정보" && <button type="button" onClick={loadLoginInfo} className="whitespace-nowrap rounded-md border border-teal-200 px-2.5 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-50">로그인 정보 불러오기</button>}{type === "quotation" && section.title === "견적 내역" && <button type="button" onClick={loadCart} className="whitespace-nowrap rounded-md border border-damda-yellow px-2.5 py-1.5 text-xs font-bold text-gray-900 hover:bg-amber-50">장바구니 내역 불러오기</button>}{type === "payment-statement" && section.title === "결제 금액" && <button type="button" onClick={() => void openReservationPicker()} disabled={isLoadingReservations} className="whitespace-nowrap rounded-md border border-damda-yellow px-2.5 py-1.5 text-xs font-bold text-gray-900 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60">{isLoadingReservations ? "예약 내역 불러오는 중" : "예약 결제 정보 불러오기"}</button>}</div>
              {section.description && <p className="mt-1 whitespace-pre-line text-xs leading-5 text-gray-500">{section.description}</p>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {section.fields.filter((field) => (!(["quotation", "payment-statement"].includes(type)) || field.name !== "discountAmount")).map((field) => <EditorField key={field.name} field={field} value={values[field.name] || ""} onChange={(value) => updateValue(field.name, value)} />)}
              </div>
            </section>
          ))}
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start print:static">
          <div className="mb-2 flex items-center justify-between print:hidden"><p className="text-sm font-bold text-gray-700">실시간 문서 미리보기</p><p className="text-xs text-gray-500">A4 기준</p></div>
          <FreeFormPreview definition={definition} values={values} />
        </div>
      </div>
      {isReservationPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="reservation-picker-title">
          <div className="max-h-[86vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div><h2 id="reservation-picker-title" className="text-lg font-black text-gray-950">예약·결제 정보 선택</h2><p className="mt-1 text-xs text-gray-500">불러올 예약 건을 선택하세요.</p></div>
              <button type="button" onClick={() => setIsReservationPickerOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="예약 선택창 닫기"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[calc(86vh-88px)] space-y-2 overflow-y-auto p-4">
              {reservationChoices.map((reservation) => (
                <button key={reservation.id} type="button" onClick={() => loadReservation(reservation)} className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-damda-yellow hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-damda-yellow">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-gray-950">{reservation.productName}</p><p className="mt-1 text-xs text-gray-500">예약번호 {reservation.reservationNumber}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${reservation.payment?.status === "paid" ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-600"}`}>{reservation.payment ? paymentStatusLabel(reservation.payment.status) : "결제 정보 없음"}</span></div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600"><span>{reservation.reservedDate}{reservation.reservedTime ? ` ${reservation.reservedTime.slice(0, 5)}` : ""}</span><span>{reservation.participantCount.toLocaleString("ko-KR")}명</span><span className="font-bold text-gray-900">{reservation.totalAmount.toLocaleString("ko-KR")}원</span></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
