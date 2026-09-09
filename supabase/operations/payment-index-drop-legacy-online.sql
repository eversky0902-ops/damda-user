-- APPROVAL REQUIRED. Run as standalone autocommit statements, never inside BEGIN/migration push.
-- Keep order-level cross-order uniqueness and the verified ledger; permit multi-item orders.
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.payments_nicepay_reservation_tid_unique') AND indisvalid AND indisunique)
    OR NOT EXISTS(SELECT 1 FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
      WHERE i.indrelid='public.payment_orders'::regclass AND i.indisunique AND i.indisvalid
        AND i.indnkeyatts=1 AND a.attname='pg_tid') THEN
    RAISE EXCEPTION 'valid replacement and order transaction uniqueness required';
  END IF;
END $$;
SET lock_timeout='2s';
SET statement_timeout='30s';
DROP INDEX CONCURRENTLY IF EXISTS public.payments_pg_tid_unique;
RESET statement_timeout;
RESET lock_timeout;
