"use client";

import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MessageCircle } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="mb-4 inline-block">
              <Image src="/logo.svg" alt="담다" width={80} height={32} className="h-8 w-auto" />
            </Link>
            <p className="mb-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              담다는 보육기관과 인증된 기관을 위한 현장체험 플랫폼입니다.
              <br />
              안전하게 검증된 체험 프로그램만을 제공합니다.
            </p>
          </div>

          {/* 고객센터 */}
          <div className="md:col-start-4">
            <h3 className="mb-4 font-semibold">고객센터</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <div>
                  <span className="font-medium text-foreground">1588-0000</span>
                  <span className="ml-2 text-xs">(평일 09:00-18:00)</span>
                </div>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:support@damda.co.kr" className="hover:text-foreground">
                  support@damda.co.kr
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <a
                  href="https://pf.kakao.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  카카오톡 상담
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm text-muted-foreground md:flex-row">
          <p>&copy; {currentYear} 담다. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
