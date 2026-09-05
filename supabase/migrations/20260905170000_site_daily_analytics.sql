-- Privacy-preserving first-party analytics for the DAMDA homepage.
-- Raw IP addresses, user agents, emails and member IDs are never stored.

CREATE TABLE IF NOT EXISTS public.site_daily_metrics (
  metric_date date NOT NULL,
  metric_key text NOT NULL CHECK (metric_key IN ('daily_visit', 'partner_cta_click', 'signup_cta_click')),
  metric_count bigint NOT NULL DEFAULT 0 CHECK (metric_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (metric_date, metric_key)
);

CREATE TABLE IF NOT EXISTS public.site_daily_visitors (
  metric_date date NOT NULL,
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (metric_date, visitor_hash)
);

ALTER TABLE public.site_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_daily_visitors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.site_daily_metrics FROM anon, authenticated;
REVOKE ALL ON TABLE public.site_daily_visitors FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_site_analytics(
  p_metric_key text,
  p_visitor_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date;
  v_inserted boolean := true;
BEGIN
  IF p_metric_key NOT IN ('daily_visit', 'partner_cta_click', 'signup_cta_click') THEN
    RAISE EXCEPTION 'INVALID_ANALYTICS_METRIC';
  END IF;

  IF p_metric_key = 'daily_visit' THEN
    IF p_visitor_id IS NULL THEN
      RAISE EXCEPTION 'VISITOR_ID_REQUIRED';
    END IF;

    INSERT INTO public.site_daily_visitors(metric_date, visitor_hash)
    VALUES (
      v_today,
      encode(extensions.digest(p_visitor_id::text, 'sha256'), 'hex')
    )
    ON CONFLICT DO NOTHING;

    v_inserted := FOUND;
  END IF;

  IF v_inserted THEN
    INSERT INTO public.site_daily_metrics(metric_date, metric_key, metric_count)
    VALUES (v_today, p_metric_key, 1)
    ON CONFLICT (metric_date, metric_key)
    DO UPDATE SET
      metric_count = public.site_daily_metrics.metric_count + 1,
      updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.track_site_analytics(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_site_analytics(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_site_analytics(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  metric_date date,
  daily_visits bigint,
  partner_cta_clicks bigint,
  signup_cta_clicks bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE id = auth.uid()
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date OR p_end_date - p_start_date > 370 THEN
    RAISE EXCEPTION 'INVALID_ANALYTICS_DATE_RANGE';
  END IF;

  RETURN QUERY
  SELECT
    day::date,
    coalesce(max(m.metric_count) FILTER (WHERE m.metric_key = 'daily_visit'), 0)::bigint,
    coalesce(max(m.metric_count) FILTER (WHERE m.metric_key = 'partner_cta_click'), 0)::bigint,
    coalesce(max(m.metric_count) FILTER (WHERE m.metric_key = 'signup_cta_click'), 0)::bigint
  FROM generate_series(p_start_date, p_end_date, interval '1 day') day
  LEFT JOIN public.site_daily_metrics m ON m.metric_date = day::date
  GROUP BY day
  ORDER BY day;
END;
$$;

REVOKE ALL ON FUNCTION public.get_site_analytics(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_analytics(date, date) TO authenticated;

COMMENT ON FUNCTION public.track_site_analytics(text, uuid)
  IS 'Records privacy-preserving daily homepage visits and CTA clicks.';
COMMENT ON FUNCTION public.get_site_analytics(date, date)
  IS 'Returns daily homepage analytics to authenticated active administrators.';
