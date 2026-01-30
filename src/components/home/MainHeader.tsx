"use client";

import Link from "next/link";
import Image from "next/image";
import { User, ShoppingCart, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/stores/cart-store";

export function MainHeader() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  // Using store directly to avoid re-renders from useCart sync
  const cartItemCount = useCartStore((state) => state.items.length);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* Top bar */}
      <div className="bg-gray-100 text-xs">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex justify-end gap-3 text-gray-600">
          {isLoading ? (
            <span className="text-gray-400">로딩중...</span>
          ) : isAuthenticated ? (
            <>
              <span className="text-gray-700">{user?.name || user?.email}</span>
              <span className="text-gray-300">|</span>
              <Link href="/mypage" className="hover:text-gray-900">마이페이지</Link>
              <span className="text-gray-300">|</span>
              <button onClick={handleLogout} className="hover:text-gray-900">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-gray-900">로그인</Link>
              <span className="text-gray-300">|</span>
              <Link href="/signup" className="hover:text-gray-900">회원가입</Link>
            </>
          )}
          <span className="text-gray-300">|</span>
          <Link href="/notice" className="hover:text-gray-900">공지사항</Link>
          <span className="text-gray-300">|</span>
          <Link href="/faq" className="hover:text-gray-900">FAQ</Link>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/home" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="담다"
              width={120}
              height={45}
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/* Right icons */}
          <div className="flex items-center gap-4">
            <Link href="/mypage" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <User className="w-6 h-6 text-gray-700" />
            </Link>
            <Link href="/mypage/recent" className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="최근 본 상품">
              <Clock className="w-6 h-6 text-gray-700" />
            </Link>
            <Link href="/cart" className="p-2 hover:bg-gray-100 rounded-full transition-colors relative">
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
