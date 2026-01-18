import Link from "next/link";
import Image from "next/image";

export function MainFooter() {
  return (
    <footer className="bg-[#3d3d3d] text-gray-300">
      {/* Top links */}
      <div className="border-b border-gray-600">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between text-sm">
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white">정책·약관</Link>
            <Link href="/privacy" className="hover:text-white font-semibold">개인정보처리방침</Link>
          </div>
          <div className="flex gap-4">
            <Link href="/support" className="hover:text-white">제휴문의</Link>
            <Link href="/notice" className="hover:text-white">공지사항</Link>
            <Link href="/careers" className="hover:text-white">인재채용</Link>
            <Link href="/sns" className="hover:text-white">SNS</Link>
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
              <p>상호명 : 담다 | 대표자명 : 이승규 | Tel : 010-5717-0711 | 주소 : 경기도 고양시 덕양구 창릉 2로 21 골드프라이스빌딩 302-305호</p>
              <p>사업자등록번호 : 660-08-02811, 통신판매업신고 : 2025-고양덕양구-0961, 개인정보보호책임자 : 이승규</p>
            </div>
          </div>

          {/* Customer center */}
          <div className="lg:text-right">
            <p className="text-sm text-gray-400 mb-1">고객센터</p>
            <p className="text-2xl font-bold text-white mb-2">1111-2222</p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>평일 : 9:00~19:00, 점심 : 12:00~13:00 (토/일/공휴일 휴무)</p>
              <p>FAX : 02-1234-5678 | 이메일 : damda@gmail.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-600">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-xs text-gray-500 text-center">
            ©2025 담다. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
