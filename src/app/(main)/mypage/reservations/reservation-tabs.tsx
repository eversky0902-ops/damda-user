"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { value: "all", label: "전체" },
  { value: "ongoing", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소/환불" },
];

interface ReservationTabsProps {
  currentStatus: string;
}

export function ReservationTabs({ currentStatus }: ReservationTabsProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={`/mypage/reservations?status=${tab.value}`}
          className={`flex-1 text-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            currentStatus === tab.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
