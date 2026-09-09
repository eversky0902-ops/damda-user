-- APPROVAL REQUIRED. Run as standalone autocommit statements, never inside BEGIN/migration push.
-- A timeout/duplicate failure leaves checkout serving; inspect invalid index before retrying.
SET lock_timeout='2s';
SET statement_timeout='5min';
CREATE UNIQUE INDEX CONCURRENTLY payments_nicepay_reservation_tid_unique
  ON public.payments(reservation_id,pg_tid) WHERE pg_provider='nicepay' AND pg_tid IS NOT NULL;
RESET statement_timeout;
RESET lock_timeout;
