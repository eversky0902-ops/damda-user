"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
const NAVER_CONVERSION_EVENT = "damda:naver-conversion";

type NaverConversionType = "signup_request" | "partner_inquiry";

export function trackNaverConversion(type: NaverConversionType) {
  window.dispatchEvent(
    new CustomEvent(NAVER_CONVERSION_EVENT, { detail: { type } }),
  );
}

export function NaverAnalytics() {
  const [isPremiumScriptReady, setIsPremiumScriptReady] = useState(false);
  const [isAnalyticsScriptReady, setIsAnalyticsScriptReady] = useState(false);
  const pendingConversions = useRef(0);
  const areScriptsReady = isPremiumScriptReady && isAnalyticsScriptReady;

  const sendConversionPageView = useCallback(() => {
    window.wcs_add ??= {};
    window._nasa ??= {};

    if (window.wcs && window.wcs_do) {
      window.wcs_add.wa = NAVER_PREMIUM_LOG_SITE_ID;
      window.wcs.inflow();
      window.wcs_do();

      window.wcs_add.wa = NAVER_ANALYTICS_SITE_ID;
      window.wcs_do();
    }
  }, []);

  useEffect(() => {
    const handleConversion = () => {
      if (areScriptsReady) {
        sendConversionPageView();
      } else {
        pendingConversions.current += 1;
      }
    };

    window.addEventListener(NAVER_CONVERSION_EVENT, handleConversion);
    return () => {
      window.removeEventListener(NAVER_CONVERSION_EVENT, handleConversion);
    };
  }, [areScriptsReady, sendConversionPageView]);

  useEffect(() => {
    if (!areScriptsReady || pendingConversions.current === 0) return;

    const queuedConversions = pendingConversions.current;
    pendingConversions.current = 0;

    for (let index = 0; index < queuedConversions; index += 1) {
      sendConversionPageView();
    }
  }, [areScriptsReady, sendConversionPageView]);

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
