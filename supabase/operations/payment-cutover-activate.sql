-- APPROVAL REQUIRED. Activate only after verified-v2 serves all payment URLs,
-- old approval requests/test windows are drained, online indexes are ready, and rollback is ready.
-- Operator must set BOTH session attestations after checking them (not in this script):
-- damda.payment_server_revision = verified-v2
-- damda.payment_test_traffic_drained = true
-- No approval OFF, order-RPC revoke, historical rewrites, or notification replay.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
DO $$ BEGIN
  IF current_setting('damda.payment_server_revision',true) IS DISTINCT FROM 'verified-v2'
    OR current_setting('damda.payment_test_traffic_drained',true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'verified server and drained test traffic must be attested';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM payment_private.configuration WHERE singleton AND approvals_enabled AND NOT boundary_activated) THEN
    RAISE EXCEPTION 'payment preparation not ready or boundary already active';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.payments_nicepay_reservation_tid_unique') AND indisvalid AND indisunique)
    OR to_regclass('public.payments_pg_tid_unique') IS NOT NULL THEN
    RAISE EXCEPTION 'complete separate online index operations first';
  END IF;
END $$;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.payment_orders FROM PUBLIC, anon, authenticated;
REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.payments, public.reservations, public.reservation_options FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON public.payments FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON public.reservation_options FROM PUBLIC, anon, authenticated;
-- Delivery claims trust successful historical logs. Browser callers must not
-- forge or erase those records, including when notification_logs has no RLS.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.notification_logs FROM PUBLIC, anon, authenticated;

CREATE TRIGGER z_payment_boundary BEFORE UPDATE ON public.payment_orders FOR EACH ROW EXECUTE FUNCTION payment_private.guard_payment_write();
CREATE TRIGGER z_payment_boundary BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION payment_private.guard_payment_write();
CREATE TRIGGER z_payment_boundary BEFORE INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION payment_private.guard_payment_write();
CREATE TRIGGER z_payment_boundary BEFORE INSERT OR UPDATE OR DELETE ON public.reservation_options FOR EACH ROW EXECUTE FUNCTION payment_private.guard_reservation_options();
-- Retain the old signature as a fail-closed compatibility tombstone.
CREATE OR REPLACE FUNCTION public.finalize_secure_payment_order(p_order_id text,p_tid text,p_paid_amount integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN RAISE EXCEPTION 'Use verified server finalization' USING ERRCODE='42501'; END $$;

GRANT CREATE ON SCHEMA public TO damda_payment_code;
ALTER FUNCTION public.finalize_secure_payment_order(text,text,integer) OWNER TO damda_payment_code;
REVOKE CREATE ON SCHEMA public FROM damda_payment_code;
REVOKE ALL ON FUNCTION public.finalize_secure_payment_order(text,text,integer) FROM PUBLIC,anon,authenticated,service_role;
-- Replace only the paid branch; cancellation behavior stays as before.
CREATE OR REPLACE FUNCTION public.notify_reservation_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NEW.status IN ('paid','confirmed') AND (TG_OP='INSERT' OR OLD.status NOT IN ('paid','confirmed','completed')) THEN
    IF EXISTS(SELECT 1 FROM payment_private.verified_transactions v JOIN public.payment_orders o ON o.order_id=v.order_id,
      jsonb_array_elements(o.items) item WHERE v.owner_id=NEW.daycare_id AND (item->>'productId')::uuid=NEW.product_id
      AND (item->>'reservedDate')::date=NEW.reserved_date AND o.status='pending') THEN
      INSERT INTO payment_private.notification_outbox(reservation_id) VALUES(NEW.id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  IF TG_OP='UPDATE' AND OLD.status NOT IN ('cancelled','refunded') AND NEW.status IN ('cancelled','refunded') THEN
    PERFORM net.http_post(url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('event','reservation_cancelled','reservation_id',NEW.id));
  END IF;
  RETURN NEW;
END $$;


REVOKE ALL ON FUNCTION public.notify_reservation_event() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.assert_payment_boundary() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE f record; r text; t text;
BEGIN
  FOR f IN SELECT p.oid,n.nspname,p.proname,p.prosecdef,p.proconfig,p.proowner FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='payment_private' OR (n.nspname='public' AND p.proname IN
      ('create_verified_payment_order','finalize_secure_payment_order','finalize_verified_payment','register_payment_authentication','claim_payment_approval','record_payment_review','claim_payment_notification','finish_payment_notification')) LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_function_privilege(r,f.oid,'EXECUTE') AND NOT (r='authenticated' AND f.oid='public.create_verified_payment_order(jsonb,jsonb,text)'::regprocedure) THEN RAISE EXCEPTION 'unsafe effective ACL: %.% / %',f.nspname,f.proname,r; END IF;
    END LOOP;
    IF f.proowner <> (SELECT oid FROM pg_roles WHERE rolname='damda_payment_code')
      OR NOT coalesce(f.proconfig @> ARRAY['search_path=pg_catalog, pg_temp'],false) THEN
      RAISE EXCEPTION 'unsafe payment function owner or search_path: %.%',f.nspname,f.proname;
    END IF;
  END LOOP;
  IF pg_has_role('anon','damda_payment_code','MEMBER') OR pg_has_role('authenticated','damda_payment_code','MEMBER') THEN RAISE EXCEPTION 'unsafe role inheritance'; END IF;
  IF (SELECT count(*) FROM pg_trigger tr JOIN pg_class c ON c.oid=tr.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND tr.tgenabled IN ('O','A') AND
      (tr.tgname='z_payment_boundary' AND c.relname IN ('payment_orders','payments','reservations','reservation_options'))) <> 4 THEN
    RAISE EXCEPTION 'payment boundary trigger missing or disabled';
  END IF;
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOREACH t IN ARRAY ARRAY['payment_orders','payments','reservation_options','notification_logs'] LOOP
      IF has_any_column_privilege(r,'public.'||t,'INSERT,UPDATE') OR has_table_privilege(r,'public.'||t,'DELETE,TRUNCATE,TRIGGER') THEN
        RAISE EXCEPTION 'unsafe effective table privilege: % / %',t,r;
      END IF;
    END LOOP;
    IF has_any_column_privilege(r,'public.reservations','INSERT') THEN RAISE EXCEPTION 'unsafe reservation insert: %',r; END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.assert_payment_boundary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assert_payment_boundary() TO service_role;
SELECT public.assert_payment_boundary();
-- Reject later accidental GRANT, overload creation, unsafe function owner/path,
-- or inherited table grants. No unrelated function ACLs are changed.
CREATE FUNCTION payment_private.guard_boundary_ddl() RETURNS event_trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN PERFORM public.assert_payment_boundary(); END $$;
REVOKE ALL ON FUNCTION payment_private.guard_boundary_ddl() FROM PUBLIC,anon,authenticated,service_role;
ALTER FUNCTION payment_private.guard_boundary_ddl() OWNER TO damda_payment_code;
GRANT EXECUTE ON FUNCTION public.assert_payment_boundary() TO damda_payment_code;
CREATE EVENT TRIGGER damda_payment_boundary_ddl ON ddl_command_end EXECUTE FUNCTION payment_private.guard_boundary_ddl();

UPDATE payment_private.configuration SET boundary_activated=true WHERE singleton;
COMMIT;
