"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DetailSectionItem {
  id: string;
  label: string;
}

export const BUSINESS_DETAIL_SECTIONS: DetailSectionItem[] = [
  { id: "products", label: "상품선택" },
  { id: "location-transport", label: "위치/교통" },
  { id: "review-summary", label: "후기요약" },
  { id: "business-introduction", label: "사업장소개" },
  { id: "facilities-services", label: "시설/서비스" },
  { id: "usage-guide", label: "이용안내" },
  { id: "reservation-notice", label: "예약공지" },
];

interface DetailSectionNavProps {
  sections?: DetailSectionItem[];
}

export function DetailSectionNav({ sections = BUSINESS_DETAIL_SECTIONS }: DetailSectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id || "");
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-164px 0px -58% 0px", threshold: [0, 0.01, 0.2] }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    buttonRefs.current[activeId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeId]);

  const moveToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    setActiveId(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="사업장 상세 섹션"
      className="sticky top-[92px] z-40 -mx-4 mt-7 border-b border-t border-gray-100 bg-white/95 shadow-[0_4px_14px_rgba(15,23,42,0.04)] backdrop-blur sm:-mx-6"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-stretch gap-7 overflow-x-auto px-4 [scrollbar-width:none] sm:gap-9 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const active = activeId === section.id;
          return (
            <button
              key={section.id}
              ref={(element) => { buttonRefs.current[section.id] = element; }}
              type="button"
              onClick={() => moveToSection(section.id)}
              aria-current={active ? "location" : undefined}
              className={cn(
                "relative shrink-0 whitespace-nowrap px-1 text-[15px] font-semibold text-gray-700 transition-colors hover:text-damda-teal-dark sm:text-base",
                active && "text-damda-teal-dark"
              )}
            >
              {section.label}
              <span
                className={cn(
                  "absolute bottom-0 left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-damda-teal transition-all duration-200",
                  active ? "w-[calc(100%+8px)] opacity-100" : "w-0 opacity-0"
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
