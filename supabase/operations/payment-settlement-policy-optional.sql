-- OPTIONAL, SEPARATE APPROVAL: not part of pre-opening payment activation.
-- Reconcile historical/test sales before enabling this stricter settlement policy.
BEGIN;
SET LOCAL lock_timeout='2s';
DO $$ BEGIN
  IF current_setting('damda.payment_settlement_audit_complete',true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'separate settlement audit approval required';
  END IF;
END $$;
SET LOCAL ROLE damda_payment_code;
CREATE FUNCTION payment_private.guard_verified_settlement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE eligible bigint;
BEGIN
  -- Existing settlements are not rewritten. Future creation/adjustment/payment of
  -- historical unreviewed sales stops until a separately approved audit resolves it.
  IF EXISTS (
    SELECT 1 FROM public.payments p JOIN public.reservations r ON r.id=p.reservation_id
    WHERE r.business_owner_id=NEW.business_owner_id AND (NEW.business_id IS NULL OR r.business_id=NEW.business_id)
      AND r.reserved_date BETWEEN NEW.settlement_period_start AND NEW.settlement_period_end
      AND p.status='paid' AND r.status='completed' AND NOT EXISTS (
        SELECT 1 FROM payment_private.verified_transactions v JOIN public.payment_orders o ON o.order_id=v.order_id
        WHERE v.tid=p.pg_tid AND r.id=ANY(o.reservation_ids)
      )
  ) THEN RAISE EXCEPTION 'Unreviewed payment history: settlement requires audit'; END IF;
  SELECT coalesce(sum(p.amount),0) INTO eligible FROM public.payments p JOIN public.reservations r ON r.id=p.reservation_id
    JOIN payment_private.verified_transactions v ON v.tid=p.pg_tid
    JOIN public.payment_orders o ON o.order_id=v.order_id AND r.id=ANY(o.reservation_ids)
    WHERE r.business_owner_id=NEW.business_owner_id AND (NEW.business_id IS NULL OR r.business_id=NEW.business_id)
      AND r.reserved_date BETWEEN NEW.settlement_period_start AND NEW.settlement_period_end
      AND p.status='paid' AND r.status='completed'
      AND coalesce((SELECT a.outcome FROM payment_private.audit_events a WHERE a.order_id=v.order_id AND a.tid=v.tid ORDER BY a.id DESC LIMIT 1),'')
        IN ('finalized','verified_existing');
  IF NEW.total_sales IS DISTINCT FROM eligible OR NEW.settlement_amount < 0 OR NEW.settlement_amount > eligible THEN
    RAISE EXCEPTION 'Settlement does not match verified sales';
  END IF;
  RETURN NEW;
END $$;


RESET ROLE;
CREATE TRIGGER z_verified_settlement BEFORE INSERT OR UPDATE ON public.settlements
FOR EACH ROW EXECUTE FUNCTION payment_private.guard_verified_settlement();
COMMIT;
