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
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MYPAGE_MENU = [
  { href: "/mypage", label: "마이페이지", icon: User, exact: true },
  { href: "/mypage/reservations", label: "예약 내역", icon: Calendar },
  { href: "/mypage/recent", label: "최근 본 상품", icon: Clock },
  { href: "/mypage/wishlist", label: "찜 목록", icon: Heart },
  { href: "/mypage/reviews", label: "내 리뷰", icon: Star },
];

export default function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex">
          {/* 사이드바 - 데스크톱 */}
          <aside className="hidden lg:block w-52 flex-shrink-0 border-r border-gray-200">
            <nav className="sticky top-[80px] py-8 pr-6">
              <h2 className="font-bold text-gray-900 mb-4">마이페이지</h2>
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
                          "flex items-center gap-3 py-2.5 text-sm transition-colors",
                          isActive
                            ? "text-damda-yellow font-medium"
                            : "text-gray-600 hover:text-gray-900"
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

          {/* 메인 영역 */}
          <div className="flex-1 min-w-0">
            {/* 모바일 네비게이션 */}
            <div className="lg:hidden overflow-x-auto border-b border-gray-200">
              <nav className="flex">
                {MYPAGE_MENU.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px",
                        isActive
                          ? "border-damda-yellow text-gray-900 font-medium"
                          : "border-transparent text-gray-500 hover:text-gray-700"
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
            <main className="lg:pl-8">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
