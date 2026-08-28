import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이메일 무단 수집거부",
  description: "담다 웹사이트의 이메일 무단 수집거부 안내입니다.",
};

export default function EmailRejectionPage() {
  return (
    <main className="min-h-screen bg-white">
      <article className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <header className="border-b border-gray-200 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">이메일 무단 수집거부</h1>
          <p className="mt-2 text-sm text-gray-500">게시일자: 2026년 7월 16일</p>
        </header>

        <div className="space-y-6 py-8 text-sm leading-8 text-gray-700 md:text-base">
          <p>
            본 웹사이트에 게시된 이메일 주소가 전자우편 수집 프로그램이나 그 밖의 기술적 장치를 이용하여 무단으로 수집되는 것을 거부합니다.
          </p>
          <p>
            이를 위반하여 이메일 주소를 무단 수집·판매·유통하거나 정보 전송에 이용할 경우 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령에 따라 형사처벌 및 손해배상 등의 책임을 질 수 있습니다.
          </p>
          <p>
            이용자 여러분께서는 본 웹사이트의 이메일 주소를 무단으로 수집하거나 스팸 메일 발송 목적으로 이용하지 않도록 유의하여 주시기 바랍니다.
          </p>
          <p>감사합니다.</p>
        </div>
      </article>
    </main>
  );
}
