"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "recommended", label: "추천순", icon: Star },
  { value: "newest", label: "최신순" },
  { value: "sales", label: "판매량순" },
  { value: "reviews", label: "리뷰순" },
  { value: "price_high", label: "높은 가격순" },
  { value: "price_low", label: "낮은 가격순" },
] as const;

export function ProductSortTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "recommended";

  const handleSortChange = (sortValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sortValue);
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {SORT_OPTIONS.map((option) => {
        const isActive = currentSort === option.value;
        const Icon = "icon" in option ? option.icon : null;

        return (
          <button
            key={option.value}
            onClick={() => handleSortChange(option.value)}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm rounded-full transition-colors",
              isActive
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
