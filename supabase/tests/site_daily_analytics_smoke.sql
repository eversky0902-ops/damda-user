BEGIN;

DO $$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date;
  v_before bigint;
  v_after bigint;
  v_admin_id uuid;
BEGIN
  IF to_regclass('public.site_daily_metrics') IS NULL
    OR to_regclass('public.site_daily_visitors') IS NULL THEN
    RAISE EXCEPTION 'analytics tables are missing';
  END IF;

  IF has_table_privilege('anon', 'public.site_daily_metrics', 'SELECT')
    OR has_table_privilege('authenticated', 'public.site_daily_visitors', 'SELECT') THEN
    RAISE EXCEPTION 'raw analytics tables must not be readable by clients';
  END IF;

  IF NOT has_function_privilege('anon', 'public.track_site_analytics(text,uuid)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.get_site_analytics(date,date)', 'EXECUTE') THEN
    RAISE EXCEPTION 'analytics RPC grants are missing';
  END IF;

  SELECT coalesce(metric_count, 0)
    INTO v_before
    FROM public.site_daily_metrics
   WHERE metric_date = v_today AND metric_key = 'daily_visit';
  v_before := coalesce(v_before, 0);

  PERFORM public.track_site_analytics('daily_visit', '11111111-1111-4111-8111-111111111111');
  PERFORM public.track_site_analytics('daily_visit', '11111111-1111-4111-8111-111111111111');

  SELECT coalesce(metric_count, 0)
    INTO v_after
    FROM public.site_daily_metrics
   WHERE metric_date = v_today AND metric_key = 'daily_visit';

  IF v_after <> v_before + 1 THEN
    RAISE EXCEPTION 'daily visit deduplication failed: before %, after %', v_before, v_after;
  END IF;

  SELECT id INTO v_admin_id FROM public.admins WHERE is_active = true LIMIT 1;
  IF v_admin_id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    PERFORM 1 FROM public.get_site_analytics(v_today, v_today);
  END IF;
END;
$$;

ROLLBACK;
