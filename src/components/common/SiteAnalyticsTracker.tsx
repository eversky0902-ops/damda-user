"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackSiteAnalytics, type SiteAnalyticsMetric } from "@/lib/siteAnalytics";

const TRACKED_HOME_PATHS = new Set(["/", "/home"]);

export function SiteAnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (TRACKED_HOME_PATHS.has(pathname)) {
      trackSiteAnalytics("daily_visit");
    }
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const element = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-analytics-metric]")
        : null;
      const metric = element?.dataset.analyticsMetric as SiteAnalyticsMetric | undefined;
      if (metric === "partner_cta_click" || metric === "signup_cta_click") {
        trackSiteAnalytics(metric);
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return null;
}
