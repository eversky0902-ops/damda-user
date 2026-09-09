-- Product booking windows are always presented as a rolling one-year period.
-- The UI displays this as read-only, and the database job keeps the policy intact
-- even if a product is not edited again before its end date.

CREATE OR REPLACE FUNCTION public.apply_product_booking_window_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date;
BEGIN
  IF NEW.booking_start_date IS NULL THEN
    NEW.booking_start_date := v_today;
  END IF;

  IF NEW.booking_end_date IS NULL THEN
    NEW.booking_end_date := (NEW.booking_start_date + INTERVAL '1 year')::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_apply_product_booking_window_defaults ON public.products;
CREATE TRIGGER a_apply_product_booking_window_defaults
  BEFORE INSERT OR UPDATE OF booking_start_date, booking_end_date ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.apply_product_booking_window_defaults();

CREATE OR REPLACE FUNCTION public.renew_expiring_product_booking_windows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date;
  v_updated_count integer;
BEGIN
  UPDATE public.products
  SET booking_start_date = v_today,
      booking_end_date = (v_today + INTERVAL '1 year')::date,
      updated_at = now()
  WHERE booking_end_date IS NULL
     OR booking_end_date <= v_today + 30;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

UPDATE public.products
SET booking_start_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date,
    booking_end_date = ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 year')::date,
    updated_at = now()
WHERE booking_start_date IS NULL
   OR booking_end_date IS NULL
   OR booking_end_date <= ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date + 30);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_booking_cutoff_options_check' AND conrelid = 'public.products'::regclass) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_booking_cutoff_options_check
      CHECK (booking_cutoff_hours IN (24, 72, 168, 360, 720)) NOT VALID;
  END IF;
END;
$$;

DO $cron$
DECLARE
  v_job_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron is required for product booking-window renewal';
  END IF;

  FOR v_job_id IN EXECUTE 'SELECT jobid FROM cron.job WHERE jobname = ''renew-expiring-product-booking-windows'''
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'renew-expiring-product-booking-windows',
    '10 15 * * *',
    'SELECT public.renew_expiring_product_booking_windows();'
  );
END;
$cron$;
