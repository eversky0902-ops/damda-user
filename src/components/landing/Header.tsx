"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="담다" width={140} height={52} priority className="h-10 w-auto" />
        </Link>

        {/* CTA Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="ghost"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/login">로그인</Link>
          </Button>
          <Button
            asChild
            className="btn-shine rounded-full bg-primary px-6 font-medium text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
          >
            <Link href="/signup">가입 신청</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-secondary md:hidden"
          aria-label="메뉴 열기"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`absolute left-0 right-0 top-full overflow-hidden bg-white shadow-lg transition-all duration-300 md:hidden ${
          isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col p-4">
          <div className="flex flex-col gap-2">
            <Button variant="outline" asChild className="justify-center">
              <Link href="/login">로그인</Link>
            </Button>
            <Button asChild className="justify-center">
              <Link href="/signup">가입 신청</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
