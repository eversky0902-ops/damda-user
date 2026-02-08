import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

async function getServiceSettings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["service_phone", "service_email", "business_hours"]);

  if (!data) return { phone: "010-7625-3711", email: "damda_0003@naver.com", hoursStart: "09:00", hoursEnd: "18:00" };

  const settings: Record<string, unknown> = {};
  for (const row of data) {
    try {
      settings[row.key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
    } catch {
      settings[row.key] = row.value;
    }
  }

  const phone = (settings.service_phone as string) || "010-7625-3711";
  const email = (settings.service_email as string) || "damda_0003@naver.com";
  const hours = settings.business_hours as { start: string; end: string } | undefined;

  return {
    phone,
    email,
    hoursStart: hours?.start || "09:00",
    hoursEnd: hours?.end || "18:00",
  };
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export async function MainFooter() {
  const settings = await getServiceSettings();
  const displayPhone = formatPhone(settings.phone);

  return (
    <footer className="bg-[#3d3d3d] text-gray-300">
      {/* Top links */}
      <div className="border-b border-gray-600">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between text-sm">
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white">이용약관</Link>
            <Link href="/privacy" className="hover:text-white font-semibold">개인정보처리방침</Link>
            <Link href="/refund-policy" className="hover:text-white">환불정책</Link>
            <Link href="/reservation-guide" className="hover:text-white">예약안내</Link>
          </div>
          <div className="flex gap-4">
            <Link href="/partner" className="hover:text-white">입점문의</Link>
            <Link href="/notice" className="hover:text-white">공지사항</Link>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 justify-between">
          {/* Company info */}
          <div className="flex-1">
            <div className="mb-4">
              <Image
                src="/logo-white.svg"
                alt="담다"
                width={100}
                height={38}
                className="h-8 w-auto"
              />
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p>상호명 : 담다 | 대표자명 : 이승규 | 주소 : 인천광역시 연수구 컨벤시아대로 81, 5층 509호-175A호</p>
              <p>사업자등록번호 : 660-08-02811 | 통신판매업신고 : 2026-인천연수구-0118호 | 개인정보보호책임자 : 이승규</p>
            </div>
          </div>

          {/* Customer center */}
          <div className="lg:text-right">
            <p className="text-sm text-gray-400 mb-1">고객센터</p>
            <p className="text-2xl font-bold text-white mb-2">{displayPhone}</p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>평일 {settings.hoursStart}~{settings.hoursEnd}, 점심 12:00~13:00 (토/일/공휴일 휴무)</p>
              <p>이메일 : {settings.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-600">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-[11px] text-gray-400 text-center mb-2">
            담다는 통신판매 중개자로서 통신판매의 당사자가 아니며 상품의 예약, 이용 및 환불 등과 관련한 의무와 책임은 각 판매자에게 있습니다.
          </p>
          <p className="text-xs text-gray-500 text-center">
            ©2026 담다. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
