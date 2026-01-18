"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Calendar,
  Heart,
  Star,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MYPAGE_MENU = [
  { href: "/mypage", label: "마이페이지", icon: User, exact: true },
  { href: "/mypage/reservations", label: "예약 내역", icon: Calendar },
  { href: "/mypage/wishlist", label: "찜 목록", icon: Heart },
  { href: "/mypage/reviews", label: "내 리뷰", icon: Star },
  { href: "/mypage/inquiries", label: "1:1 문의", icon: MessageSquare },
];

export default function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 사이드바 - 데스크톱 */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <nav className="bg-white rounded-xl p-4 sticky top-[140px]">
              <h2 className="font-bold text-gray-900 px-3 mb-4">마이페이지</h2>
              <ul className="space-y-1">
                {MYPAGE_MENU.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-damda-yellow-light text-damda-yellow-dark font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* 모바일 네비게이션 */}
          <div className="lg:hidden overflow-x-auto pb-2">
            <nav className="flex gap-2 min-w-max">
              {MYPAGE_MENU.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-damda-yellow-light0 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 메인 콘텐츠 */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
