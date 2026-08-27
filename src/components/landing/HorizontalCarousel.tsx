"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalCarouselProps {
  children: ReactNode[];
  ariaLabel: string;
  desktopItems: 3 | 4;
}

const SCROLL_SPEED = 36;

export function HorizontalCarousel({
  children,
  ariaLabel,
  desktopItems,
}: HorizontalCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const firstGroupRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateWidth = () => setViewportWidth(viewport.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const firstGroup = firstGroupRef.current;
    if (!viewport || !firstGroup || children.length <= 1) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animationFrame = 0;
    let previousTime = performance.now();
    let currentPosition = viewport.scrollLeft;

    const moveContinuously = (currentTime: number) => {
      const elapsedSeconds = Math.min(currentTime - previousTime, 50) / 1000;
      previousTime = currentTime;

      if (isInteractingRef.current) {
        currentPosition = viewport.scrollLeft;
      } else {
        currentPosition += SCROLL_SPEED * elapsedSeconds;
        const groupWidth = firstGroup.scrollWidth;
        if (groupWidth > 0 && currentPosition >= groupWidth) {
          currentPosition -= groupWidth;
        }
        viewport.scrollLeft = currentPosition;
      }

      animationFrame = window.requestAnimationFrame(moveContinuously);
    };

    animationFrame = window.requestAnimationFrame(moveContinuously);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [children.length]);

  const scrollByPage = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    isInteractingRef.current = true;
    viewport.scrollBy({
      left: direction * Math.max(viewport.clientWidth * 0.75, 280),
      behavior: "smooth",
    });
    window.setTimeout(() => {
      isInteractingRef.current = false;
    }, 700);
  };

  const renderItems = (copy: "original" | "duplicate") =>
    children.map((child, index) => (
      <div
        key={`${copy}-${index}`}
        className="min-w-0 shrink-0 pl-3 sm:pl-6"
        style={{
          width:
            viewportWidth > 0
              ? `${
                  (viewportWidth -
                    (viewportWidth >= 640 ? 24 : 12) *
                      ((viewportWidth >= 1024 ? desktopItems : viewportWidth >= 640 ? 2 : 1.12) - 1)) /
                  (viewportWidth >= 1024 ? desktopItems : viewportWidth >= 640 ? 2 : 1.12)
                }px`
              : undefined,
        }}
        aria-hidden={copy === "duplicate" ? true : undefined}
      >
        {child}
      </div>
    ));

  return (
    <div className="relative" aria-label={ariaLabel}>
      <div
        ref={viewportRef}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerDown={() => {
          isInteractingRef.current = true;
        }}
        onPointerUp={() => {
          isInteractingRef.current = false;
        }}
        onPointerCancel={() => {
          isInteractingRef.current = false;
        }}
        onPointerLeave={() => {
          isInteractingRef.current = false;
        }}
      >
        <div className="flex w-max touch-pan-x">
          <div ref={firstGroupRef} className="flex shrink-0">
            {renderItems("original")}
          </div>
          <div className="flex shrink-0">{renderItems("duplicate")}</div>
        </div>
      </div>

      {children.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label={`${ariaLabel} 이전 항목`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-sm transition hover:border-primary hover:text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label={`${ariaLabel} 다음 항목`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-sm transition hover:border-primary hover:text-primary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
