import {
  calculateFreeFormAmounts,
  DAMDA_BUSINESS_SEAL_SRC,
  DAMDA_DOCUMENT_WATERMARK_SRC,
  formatWon,
  formatNumber,
  type FreeFormDefinition,
  type FreeFormType,
  type FreeFormValues,
} from "@/lib/free-forms";

function PreviewValue({ value }: { value?: string }) {
  return <span className={`block min-h-5 whitespace-pre-line leading-6 ${value ? "text-gray-800" : "text-gray-300"}`}>{value || " "}</span>;
}

function AmountSummary({ type, values }: { type: FreeFormType; values: FreeFormValues }) {
  const amount = calculateFreeFormAmounts(values, { includeDiscount: false });
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="border-l-4 border-damda-yellow pl-2 text-sm font-bold text-gray-950">금액 합계</h2>
      <div className="mt-2 overflow-hidden rounded-lg border border-gray-300">
        <table className="w-full text-xs sm:text-sm">
          <tbody className="divide-y divide-gray-200">
            <PreviewRow label="인원별 금액" value={`${amount.participantCount.toLocaleString("ko-KR")}명 × ${formatWon(amount.unitPrice)} = ${formatWon(amount.subtotal)}`} />
            <PreviewRow label="옵션·추가금액" value={formatWon(amount.optionAmount)} />
            {type === "payment-statement" && amount.refundAmount > 0 && <PreviewRow label="취소·환불금액" value={`-${formatWon(amount.refundAmount)}`} />}
            <tr className="bg-amber-50">
              <th className="w-36 bg-amber-100/70 px-3 py-3 text-left font-bold text-gray-800">{type === "quotation" ? "최종 견적금액" : "최종 결제금액"}</th>
              <td className="px-3 py-3 text-right text-base font-black text-gray-950">{formatWon(type === "payment-statement" ? amount.paidTotal : amount.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <tr><th className="w-36 bg-gray-50 px-3 py-2.5 text-left font-semibold text-gray-600">{label}</th><td className="px-3 py-2.5 text-right text-gray-800">{value}</td></tr>;
}

function FamilyConsent() {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="border-l-4 border-damda-yellow pl-2 text-sm font-bold text-gray-950">보호자 참여동의서</h2>
      <div className="mt-2 overflow-hidden rounded-lg border border-gray-300">
        <table className="w-full text-xs sm:text-sm"><tbody className="divide-y divide-gray-200">
          <tr><th className="w-36 bg-gray-50 px-3 py-3 text-left">체험 참여</th><td className="px-3 py-3">□ 참여합니다　　□ 참여하지 않습니다</td></tr>
          <tr><th className="bg-gray-50 px-3 py-3 text-left">사진 촬영·활용</th><td className="px-3 py-3">□ 동의합니다　　□ 동의하지 않습니다</td></tr>
          <tr><th className="bg-gray-50 px-3 py-3 text-left">알레르기·건강 특이사항</th><td className="h-16 px-3 py-3" /></tr>
          <tr><th className="bg-gray-50 px-3 py-3 text-left">비상 연락처</th><td className="px-3 py-3" /></tr>
          <tr><th className="bg-gray-50 px-3 py-3 text-left">보호자 확인</th><td className="px-3 py-3">원아명: ______________　보호자명: ______________ (서명)</td></tr>
        </tbody></table>
      </div>
    </section>
  );
}

function SafetySignoff() {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="border-l-4 border-damda-yellow pl-2 text-sm font-bold text-gray-950">교육 실시 확인</h2>
      <div className="mt-2 overflow-hidden rounded-lg border border-gray-300">
        <table className="w-full text-xs sm:text-sm"><tbody>
          <tr><th className="w-28 border-b border-r bg-gray-50 px-3 py-3 text-left">담당 교사</th><td className="border-b border-r px-3 py-3" /><th className="w-28 border-b border-r bg-gray-50 px-3 py-3 text-left">원장·책임자</th><td className="border-b px-3 py-3" /></tr>
          <tr><th className="border-r bg-gray-50 px-3 py-3 text-left">특이사항</th><td colSpan={3} className="h-16 px-3 py-3" /></tr>
        </tbody></table>
      </div>
    </section>
  );
}

export function FreeFormPreview({ definition, values }: { definition: FreeFormDefinition; values: FreeFormValues }) {
  return (
    <article className="document-sheet relative isolate min-h-[297mm] overflow-hidden bg-white p-5 text-gray-900 shadow-sm sm:p-8 print:min-h-0 print:p-0 print:shadow-none [&>*:not(.document-watermark)]:relative [&>*:not(.document-watermark)]:z-[2]">
      <img
        src={DAMDA_DOCUMENT_WATERMARK_SRC}
        alt=""
        aria-hidden="true"
        className="document-watermark pointer-events-none absolute left-1/2 top-[430px] z-[1] w-2/3 max-w-[420px] -translate-x-1/2 -translate-y-1/2 object-contain"
      />
      <header className="border-b-2 border-gray-950 pb-4 text-center">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-500">DAMDA FREE DOCUMENT</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">{definition.title}</h1>
      </header>

      {definition.sections.map((section) => (
        <section key={section.title} className="mt-6 break-inside-avoid">
          <h2 className="border-l-4 border-damda-yellow pl-2 text-sm font-bold text-gray-950">{section.title}</h2>
          <div className="mt-2 overflow-hidden rounded-lg border border-gray-300">
            <table className="w-full text-xs sm:text-sm"><tbody className="divide-y divide-gray-200">
              {section.fields.filter((field) => (!["quotation", "payment-statement"].includes(definition.type) || field.name !== "discountAmount")).map((field) => (
                <tr key={field.name}>
                  <th className="w-36 bg-gray-50 px-3 py-2.5 text-left align-top font-semibold text-gray-600">{field.label}</th>
                  <td className="px-3 py-2.5 align-top"><PreviewValue value={field.kind === "number" ? formatNumber(values[field.name]) : values[field.name]} /></td>
                </tr>
              ))}
            </tbody></table>
          </div>
          {section.title === "발행자 정보" && values.issuerSeal === "true" && (
            <div className="mt-2 flex items-center justify-end gap-2 text-xs text-gray-500">
              <span>사업자 인감</span>
              <img src={DAMDA_BUSINESS_SEAL_SRC} alt="담다 사업자 인감" className="h-20 w-20 object-contain" />
            </div>
          )}
        </section>
      ))}

      {(definition.type === "quotation" || definition.type === "payment-statement") && <AmountSummary type={definition.type} values={values} />}
      {definition.type === "family-letter" && <FamilyConsent />}
      {definition.type === "safety-education" && <SafetySignoff />}

      <footer className="mt-8 border-t border-gray-300 pt-3 text-center text-[10px] leading-5 text-gray-500">
        담다 무료 어린이집 행정자료 · 입력 내용은 이용자가 확인 후 사용해 주세요.
      </footer>
    </article>
  );
}
