"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    wcs?: {
      inflow: () => void;
    };
    wcs_add?: Record<string, string>;
    _nasa?: Record<string, unknown>;
    wcs_do?: () => void;
  }
}

const NAVER_PREMIUM_LOG_SITE_ID = "s_dce12c01c15";
const NAVER_ANALYTICS_SITE_ID = "1be49c8dbd80b10";

export function NaverAnalytics() {
  const pathname = usePathname();
  const [isPremiumScriptReady, setIsPremiumScriptReady] = useState(false);
  const [isAnalyticsScriptReady, setIsAnalyticsScriptReady] = useState(false);
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (
      !isPremiumScriptReady ||
      !isAnalyticsScriptReady ||
      lastTrackedPath.current === pathname
    ) {
      return;
    }

    window.wcs_add ??= {};
    window._nasa ??= {};

    if (window.wcs && window.wcs_do) {
      window.wcs_add.wa = NAVER_PREMIUM_LOG_SITE_ID;
      window.wcs.inflow();
      window.wcs_do();

      window.wcs_add.wa = NAVER_ANALYTICS_SITE_ID;
      window.wcs_do();
      lastTrackedPath.current = pathname;
    }
  }, [isPremiumScriptReady, isAnalyticsScriptReady, pathname]);

  return (
    <>
      <Script
        src="https://wcs.naver.net/wcslog.js"
        strategy="afterInteractive"
        onLoad={() => setIsPremiumScriptReady(true)}
      />
      <Script
        src="https://wcs.pstatic.net/wcslog.js"
        strategy="afterInteractive"
        onLoad={() => setIsAnalyticsScriptReady(true)}
      />
    </>
  );
}
