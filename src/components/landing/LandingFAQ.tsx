export const landingFaqItems = [
  {
    question: "어린이집 단체체험은 몇 명부터 예약할 수 있나요?",
    answer: "최소·최대 예약 인원은 업체와 프로그램마다 다릅니다. 각 프로그램 상세페이지의 예약 가능 인원을 확인해 주세요.",
  },
  {
    question: "대형버스 주차가 가능한가요?",
    answer: "버스 진입, 승하차 공간과 주차 가능 여부는 사업장마다 다릅니다. 프로그램 상세정보와 사업장 안내를 확인해 주세요.",
  },
  {
    question: "우천 시에도 이용할 수 있나요?",
    answer: "실내·실외 운영 여부와 우천 시 대체 프로그램은 업체별로 다릅니다. 예약한 프로그램의 우천 안내를 확인해 주세요.",
  },
  {
    question: "견적서나 증빙서류를 받을 수 있나요?",
    answer: "예약 내역에서 지원되는 견적서와 행정 문서를 확인할 수 있습니다. 제공 범위는 예약 상태와 문서 종류에 따라 달라질 수 있습니다.",
  },
  {
    question: "예약 취소와 환불은 어떻게 진행되나요?",
    answer: "취소·환불 조건은 프로그램과 예약 시점에 따라 다를 수 있습니다. 결제 전 상품의 취소·환불 기준을 확인하고, 예약 후에는 마이페이지에서 진행 상태를 확인해 주세요.",
  },
] as const;

export function LandingFAQ() {
  return (
    <section aria-labelledby="landing-faq-title" className="bg-secondary/25 py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-10 text-center">
          <h2 id="landing-faq-title" className="text-3xl font-bold tracking-tight md:text-4xl">자주 묻는 질문</h2>
          <p className="mt-4 text-lg text-muted-foreground">단체체험학습 예약 전에 자주 확인하는 내용을 모았습니다.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white px-5 sm:px-7">
          {landingFaqItems.map((item) => (
            <details key={item.question} className="group border-b border-border/60 last:border-b-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-semibold marker:content-none">
                <span>{item.question}</span>
                <span className="text-xl font-normal text-primary transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="pb-5 pr-8 leading-relaxed text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
