export type SiteAnalyticsMetric = "daily_visit" | "partner_cta_click" | "signup_cta_click";

const VISITOR_STORAGE_KEY = "damda_analytics_visitor_id";

function getVisitorId(): string {
  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing) return existing;

  const visitorId = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
  return visitorId;
}

export function trackSiteAnalytics(metric: SiteAnalyticsMetric) {
  if (typeof window === "undefined") return;

  try {
    const payload = JSON.stringify({
      metric,
      visitorId: getVisitorId(),
    });
    const body = new Blob([payload], { type: "application/json" });

    if (!navigator.sendBeacon("/api/analytics/track", body)) {
      void fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  } catch {
    // Analytics must never block navigation or the primary customer flow.
  }
}
