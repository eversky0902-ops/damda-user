-- PREPARE ONLY: additive, no checkout shutdown, no legacy ACL/function/notification switch.
-- Apply this exact file after review; do not bulk-push other pending migrations.
-- Security is not complete until operations/payment-cutover-activate.sql commits.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
CREATE SCHEMA IF NOT EXISTS payment_private;
REVOKE ALL ON SCHEMA payment_private FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA payment_private REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
CREATE TABLE payment_private.configuration (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  approvals_enabled boolean NOT NULL DEFAULT true,
  boundary_activated boolean NOT NULL DEFAULT false
);
INSERT INTO payment_private.configuration(singleton) VALUES(true);
-- Public's global function default cannot be revoked per schema. Each function below
-- has an explicit ACL in this transaction; the catalog assertion checks future drift.
CREATE TABLE payment_private.attempts (
  tid text PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.payment_orders(order_id),
  authenticated_at timestamptz,
  approval_started_at timestamptz,
  review_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_private.verified_transactions (
  tid text PRIMARY KEY,
  order_id text NOT NULL UNIQUE REFERENCES public.payment_orders(order_id),
  owner_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  evidence jsonb NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_private.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id text, tid text, actor_id uuid, source text NOT NULL,
  outcome text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_private.notification_outbox (
  reservation_id uuid PRIMARY KEY REFERENCES public.reservations(id),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','sent','review')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_private.notification_deliveries (
  reservation_id uuid NOT NULL, recipient_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (reservation_id, recipient_type)
);
-- Only the new order creator enrolls orders. Legacy orders can never claim POST approval.
CREATE TABLE payment_private.managed_orders (
  order_id text PRIMARY KEY REFERENCES public.payment_orders(order_id),
  snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON ALL TABLES IN SCHEMA payment_private FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION payment_private.order_snapshot(o public.payment_orders) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, pg_temp AS $$
  SELECT to_jsonb(o) - ARRAY['status','pg_tid','reservation_ids','updated_at']::text[]
$$;
-- Supabase owns the auth schema; postgres cannot grant its USAGE to custom roles.
-- Match Supabase's role/uid helpers exactly using PostgREST's verified JWT settings.
CREATE FUNCTION payment_private.jwt_role() RETURNS text
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),
    (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'role'))::text
$$;
CREATE FUNCTION payment_private.jwt_uid() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
    (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub'))::uuid
$$;
CREATE FUNCTION public.create_verified_payment_order(p_items jsonb,p_reserver_info jsonb,p_payment_method text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE result jsonb; o public.payment_orders%ROWTYPE;
BEGIN
  IF payment_private.jwt_role() IS DISTINCT FROM 'authenticated' OR payment_private.jwt_uid() IS NULL THEN
    RAISE EXCEPTION 'authenticated customer required' USING ERRCODE='42501';
  END IF;
  -- Existing definer computes all prices/options from the catalog under the JWT user.
  result := public.create_secure_payment_order(p_items,p_reserver_info,p_payment_method);
  SELECT * INTO o FROM public.payment_orders WHERE order_id=result->>'orderId' FOR UPDATE;
  IF NOT FOUND OR o.daycare_id IS DISTINCT FROM payment_private.jwt_uid() OR o.status <> 'pending' THEN
    RAISE EXCEPTION 'invalid created order';
  END IF;
  INSERT INTO payment_private.managed_orders(order_id,snapshot)
    VALUES(o.order_id,payment_private.order_snapshot(o));
  RETURN result;
END $$;

-- Trigger guards also apply inside SECURITY DEFINER wrappers: current_user is not
-- used as proof of a customer being privileged. The signed JWT role remains checked.
CREATE FUNCTION payment_private.guard_payment_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_TABLE_NAME = 'payment_orders' THEN
    IF ROW(NEW.order_id,NEW.daycare_id,NEW.amount,NEW.items,NEW.payment_method,NEW.expires_at)
       IS DISTINCT FROM ROW(OLD.order_id,OLD.daycare_id,OLD.amount,OLD.items,OLD.payment_method,OLD.expires_at) THEN
      RAISE EXCEPTION 'immutable order snapshot' USING ERRCODE = '42501';
    END IF;
    IF payment_private.jwt_role() IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'server-only order mutation' USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'paid' AND NOT EXISTS (SELECT 1 FROM payment_private.verified_transactions v
      WHERE v.order_id = NEW.order_id AND v.tid = NEW.pg_tid AND v.owner_id = NEW.daycare_id AND v.amount = NEW.amount) THEN
      RAISE EXCEPTION 'verified order required' USING ERRCODE = '42501';
    END IF;
  ELSIF TG_TABLE_NAME = 'payments' THEN
    IF payment_private.jwt_role() IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'server-only payment mutation' USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) AND NOT EXISTS (
      SELECT 1 FROM payment_private.verified_transactions v JOIN public.reservations r ON r.id = NEW.reservation_id
      WHERE v.tid = NEW.pg_tid AND r.daycare_id = v.owner_id AND NEW.amount = r.total_amount
    ) THEN RAISE EXCEPTION 'verified payment required' USING ERRCODE = '42501'; END IF;
  ELSE
    IF TG_OP = 'INSERT' OR ROW(NEW.daycare_id,NEW.product_id,NEW.business_owner_id,NEW.business_id,NEW.total_amount,NEW.reserved_date,NEW.reserved_time,NEW.participant_count)
      IS DISTINCT FROM ROW(OLD.daycare_id,OLD.product_id,OLD.business_owner_id,OLD.business_id,OLD.total_amount,OLD.reserved_date,OLD.reserved_time,OLD.participant_count)
      OR (NEW.status IN ('paid','confirmed','completed') AND (OLD.status IS NULL OR OLD.status NOT IN ('paid','confirmed','completed'))) THEN
      IF payment_private.jwt_role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'server-only reservation finalization' USING ERRCODE = '42501';
      END IF;
      IF NEW.status IN ('paid','confirmed','completed') AND NOT EXISTS (
        SELECT 1 FROM payment_private.verified_transactions v JOIN public.payment_orders o ON o.order_id = v.order_id,
          jsonb_array_elements(o.items) item
        WHERE v.owner_id = NEW.daycare_id AND o.status = 'pending'
          AND (item ->> 'productId')::uuid = NEW.product_id AND (item ->> 'reservedDate')::date = NEW.reserved_date
          AND (item ->> 'totalAmount')::integer = NEW.total_amount
      ) THEN RAISE EXCEPTION 'verified reservation required' USING ERRCODE = '42501'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION payment_private.guard_reservation_options() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF payment_private.jwt_role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'server-only reservation options' USING ERRCODE='42501'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.register_payment_authentication(p_order_id text, p_tid text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF payment_private.jwt_role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'server only' USING ERRCODE='42501'; END IF;
  INSERT INTO payment_private.attempts(tid,order_id,authenticated_at) VALUES(p_tid,p_order_id,now())
    ON CONFLICT(tid) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM payment_private.attempts WHERE tid=p_tid AND order_id=p_order_id) THEN
    RAISE EXCEPTION 'transaction already bound';
  END IF;
  UPDATE payment_private.attempts SET authenticated_at=coalesce(authenticated_at,now()) WHERE tid=p_tid;
END $$;

CREATE FUNCTION public.claim_payment_approval(p_order_id text,p_tid text,p_owner_id uuid,p_expected_amount integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE o public.payment_orders%ROWTYPE; claimed text;
BEGIN
  IF payment_private.jwt_role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'server only' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM payment_private.configuration WHERE singleton AND approvals_enabled) THEN RETURN false; END IF;
  SELECT * INTO o FROM public.payment_orders WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND OR o.daycare_id IS DISTINCT FROM p_owner_id THEN RAISE EXCEPTION 'order owner mismatch'; END IF;
  IF o.status <> 'pending' OR o.expires_at <= now() THEN RETURN false; END IF;
  IF NOT EXISTS(SELECT 1 FROM payment_private.managed_orders WHERE order_id=p_order_id) THEN RETURN false; END IF;
  IF NOT EXISTS(SELECT 1 FROM payment_private.managed_orders WHERE order_id=p_order_id AND snapshot=payment_private.order_snapshot(o)) THEN
    RAISE EXCEPTION 'managed order snapshot mismatch';
  END IF;
  IF p_expected_amount IS DISTINCT FROM o.amount THEN RAISE EXCEPTION 'approval amount mismatch'; END IF;
  -- No second approval for this order, including an uncertain prior attempt under another TID.
  IF EXISTS(SELECT 1 FROM payment_private.attempts WHERE order_id=p_order_id AND approval_started_at IS NOT NULL) THEN RETURN false; END IF;
  UPDATE payment_private.attempts SET approval_started_at=now(),updated_at=now()
    WHERE tid=p_tid AND order_id=p_order_id AND authenticated_at IS NOT NULL AND approval_started_at IS NULL RETURNING tid INTO claimed;
  RETURN claimed IS NOT NULL;
END $$;

CREATE FUNCTION public.record_payment_review(p_order_id text,p_tid text,p_actor_id uuid,p_source text,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF payment_private.jwt_role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'server only' USING ERRCODE='42501'; END IF;
  INSERT INTO payment_private.audit_events(order_id,tid,actor_id,source,outcome)
    VALUES(p_order_id,p_tid,p_actor_id,left(p_source,30),left(p_reason,80));
  UPDATE payment_private.attempts SET review_reason=left(p_reason,80),updated_at=now() WHERE order_id=p_order_id AND tid=p_tid;
END $$;

CREATE FUNCTION public.finalize_verified_payment(p_order_id text,p_tid text,p_owner_id uuid,p_actor_id uuid,p_source text,p_evidence jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE o public.payment_orders%ROWTYPE; result jsonb;
BEGIN
  IF payment_private.jwt_role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'server only' USING ERRCODE='42501'; END IF;
  SELECT * INTO o FROM public.payment_orders WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND OR o.daycare_id IS DISTINCT FROM p_owner_id THEN RAISE EXCEPTION 'order owner mismatch'; END IF;
  IF EXISTS(SELECT 1 FROM payment_private.managed_orders WHERE order_id=p_order_id AND snapshot IS DISTINCT FROM payment_private.order_snapshot(o)) THEN
    RAISE EXCEPTION 'managed order snapshot mismatch';
  END IF;
  IF p_source IS NULL OR p_source NOT IN ('customer','webhook','admin') OR (p_source='customer' AND p_actor_id IS DISTINCT FROM p_owner_id)
    OR (p_source='admin' AND NOT EXISTS(SELECT 1 FROM public.admins WHERE id=p_actor_id AND is_active=true)) THEN
    RAISE EXCEPTION 'invalid actor' USING ERRCODE='42501';
  END IF;
  IF (p_evidence->>'tid') IS DISTINCT FROM p_tid OR (p_evidence->>'orderId') IS DISTINCT FROM p_order_id
    OR (p_evidence->>'amount')::integer IS DISTINCT FROM o.amount OR (p_evidence->>'balanceAmt')::integer IS DISTINCT FROM o.amount
    OR (p_evidence->>'currency') IS DISTINCT FROM 'KRW' OR (p_evidence->>'status') IS DISTINCT FROM 'paid'
    OR (p_evidence->>'payMethod') IS DISTINCT FROM o.payment_method OR (p_evidence->>'environment') IS DISTINCT FROM 'production'
    OR coalesce(p_evidence->>'responseHash','') !~ '^[0-9a-f]{64}$'
    OR coalesce(p_evidence->>'merchantKeyHash','') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid verified evidence';
  END IF;
  IF o.status='paid' THEN
    IF o.pg_tid IS DISTINCT FROM p_tid THEN RAISE EXCEPTION 'different transaction'; END IF;
    INSERT INTO payment_private.audit_events(order_id,tid,actor_id,source,outcome) VALUES(p_order_id,p_tid,p_actor_id,p_source,'verified_existing');
    RETURN jsonb_build_object('orderId',o.order_id,'reservationIds',o.reservation_ids,'idempotent',true);
  END IF;
  IF o.status <> 'pending' OR o.expires_at <= now() THEN
    PERFORM public.record_payment_review(p_order_id,p_tid,p_actor_id,p_source,'late_or_inactive_paid_order');
    RETURN jsonb_build_object('reviewRequired',true);
  END IF;
  -- GET-verified paid receipts do not require a new authentication/approval attempt.
  -- Legacy orders never claim POST; pending legacy recovery requires admin review.
  IF NOT EXISTS(SELECT 1 FROM payment_private.managed_orders WHERE order_id=p_order_id) AND p_source <> 'admin' THEN
    PERFORM public.record_payment_review(p_order_id,p_tid,p_actor_id,p_source,'legacy_order_requires_review');
    RETURN jsonb_build_object('reviewRequired',true);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tid,0));
  IF EXISTS(SELECT 1 FROM public.payments WHERE pg_tid=p_tid) THEN RAISE EXCEPTION 'historical transaction already used'; END IF;
  INSERT INTO payment_private.verified_transactions(tid,order_id,owner_id,amount,evidence)
    VALUES(p_tid,p_order_id,p_owner_id,o.amount,p_evidence);
  result := payment_private.materialize_order(p_order_id,p_tid,o.amount);
  INSERT INTO payment_private.audit_events(order_id,tid,actor_id,source,outcome) VALUES(p_order_id,p_tid,p_actor_id,p_source,'finalized');
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION payment_private.materialize_order(
  p_order_id text,
  p_tid text,
  p_paid_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_order public.payment_orders%ROWTYPE;
  v_item jsonb;
  v_option jsonb;
  v_reservation_id uuid;
  v_reservation_ids uuid[] := '{}';
  v_product_id uuid;
  v_reserved_date date;
  v_item_amount integer;
  v_reservation_number text;
BEGIN
  IF payment_private.jwt_role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION '서버 전용 결제 처리입니다.' USING ERRCODE = '42501';
  END IF;
  IF p_tid IS NULL OR length(trim(p_tid)) = 0 OR length(p_tid) > 100 THEN
    RAISE EXCEPTION '결제 거래번호가 올바르지 않습니다.';
  END IF;

  SELECT * INTO v_order FROM public.payment_orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '주문 정보를 찾을 수 없습니다.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM payment_private.verified_transactions v WHERE v.order_id = p_order_id AND v.tid = p_tid AND v.amount = p_paid_amount AND v.owner_id = v_order.daycare_id) THEN
    RAISE EXCEPTION 'verified transaction required' USING ERRCODE = '42501';
  END IF;
  IF v_order.status = 'paid' THEN
    IF v_order.pg_tid = p_tid THEN
      RETURN jsonb_build_object('orderId', v_order.order_id, 'reservationIds', v_order.reservation_ids, 'idempotent', true);
    END IF;
    RAISE EXCEPTION '이미 다른 결제 거래번호로 완료된 주문입니다.';
  END IF;
  IF v_order.status <> 'pending' OR v_order.expires_at < now() OR v_order.amount <> p_paid_amount THEN
    RAISE EXCEPTION '결제 금액 또는 주문 상태가 올바르지 않습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payment_orders WHERE pg_tid = p_tid) OR EXISTS (SELECT 1 FROM public.payments WHERE pg_tid = p_tid) THEN
    RAISE EXCEPTION '이미 처리된 결제 거래번호입니다.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_order.items) ORDER BY value ->> 'productId', value ->> 'reservedDate'
  LOOP
    v_product_id := (v_item ->> 'productId')::uuid;
    v_reserved_date := (v_item ->> 'reservedDate')::date;
    v_item_amount := (v_item ->> 'totalAmount')::integer;
    PERFORM pg_advisory_xact_lock(hashtext(v_product_id::text || ':' || v_reserved_date::text));
    IF EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.product_id = v_product_id
        AND r.reserved_date = v_reserved_date
        AND r.status IN ('pending', 'paid', 'confirmed')
    ) THEN
      RAISE EXCEPTION '다른 예약으로 선택한 일정이 마감되었습니다.';
    END IF;
    v_reservation_number := 'RES' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    INSERT INTO public.reservations(
      reservation_number, daycare_id, product_id, business_owner_id, reserved_date, reserved_time,
      participant_count, total_amount, status, reserver_name, reserver_phone, reserver_email
    ) VALUES (
      v_reservation_number, v_order.daycare_id, v_product_id, (v_item ->> 'businessOwnerId')::uuid,
      v_reserved_date, NULLIF(v_item ->> 'reservedTime', '')::time,
      (v_item ->> 'participants')::integer, v_item_amount, 'confirmed',
      NULLIF(v_order.reserver_info ->> 'name', ''), NULLIF(v_order.reserver_info ->> 'phone', ''),
      NULLIF(v_order.reserver_info ->> 'email', '')
    ) RETURNING id INTO v_reservation_id;
    FOR v_option IN SELECT value FROM jsonb_array_elements(v_item -> 'options')
    LOOP
      INSERT INTO public.reservation_options(reservation_id, product_option_id, quantity, unit_price, subtotal)
      VALUES (v_reservation_id, (v_option ->> 'id')::uuid, (v_option ->> 'quantity')::integer,
        (v_option ->> 'price')::integer, (v_option ->> 'price')::integer * (v_option ->> 'quantity')::integer);
    END LOOP;
    INSERT INTO public.payments(reservation_id, pg_provider, pg_tid, payment_method, amount, status, paid_at)
    VALUES (v_reservation_id, 'nicepay', p_tid, v_order.payment_method, v_item_amount, 'paid',
      (SELECT (evidence->>'paidAt')::timestamptz FROM payment_private.verified_transactions WHERE tid=p_tid));
    v_reservation_ids := array_append(v_reservation_ids, v_reservation_id);
  END LOOP;

  UPDATE public.payment_orders
  SET status = 'paid', pg_tid = p_tid, reservation_ids = v_reservation_ids
  WHERE id = v_order.id;
  DELETE FROM public.reservation_holds WHERE daycare_id = v_order.daycare_id AND (product_id, reserved_date) IN (
    SELECT (value ->> 'productId')::uuid, (value ->> 'reservedDate')::date FROM jsonb_array_elements(v_order.items)
  );
  RETURN jsonb_build_object('orderId', v_order.order_id, 'reservationIds', v_reservation_ids, 'idempotent', false);
END;
$$;


CREATE FUNCTION public.claim_payment_notification(p_reservation_id uuid DEFAULT NULL, p_recipient_type text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE r uuid;
BEGIN
  IF payment_private.jwt_role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'server only' USING ERRCODE='42501'; END IF;
  IF p_recipient_type IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM payment_private.notification_outbox WHERE reservation_id=p_reservation_id AND state='sending') THEN RETURN 'false'::jsonb; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.reservations r JOIN public.payment_orders o ON r.id=ANY(o.reservation_ids)
      JOIN payment_private.verified_transactions v ON v.order_id=o.order_id AND v.tid=o.pg_tid
      WHERE r.id=p_reservation_id AND r.status IN ('paid','confirmed','completed') AND o.status='paid'
        AND coalesce((SELECT a.outcome FROM payment_private.audit_events a WHERE a.order_id=v.order_id AND a.tid=v.tid ORDER BY a.id DESC LIMIT 1),'') IN ('finalized','verified_existing')
    ) THEN RETURN 'false'::jsonb; END IF;
    -- Never resend the recovered transaction's existing successful notifications.
    IF EXISTS(SELECT 1 FROM public.notification_logs WHERE reference_id=p_reservation_id AND recipient_type=p_recipient_type
      AND notification_type IN ('reservation_completed','new_reservation','reservation_paid') AND status='sent') THEN RETURN 'false'::jsonb; END IF;
    INSERT INTO payment_private.notification_deliveries(reservation_id,recipient_type) VALUES(p_reservation_id,p_recipient_type)
      ON CONFLICT DO NOTHING RETURNING reservation_id INTO r;
    RETURN to_jsonb(r IS NOT NULL);
  END IF;
  SELECT reservation_id INTO r FROM payment_private.notification_outbox WHERE state='pending'
    ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
  IF r IS NULL THEN RETURN NULL; END IF;
  UPDATE payment_private.notification_outbox SET state='sending',updated_at=now() WHERE reservation_id=r;
  RETURN jsonb_build_object('reservationId',r);
END $$;
CREATE FUNCTION public.finish_payment_notification(p_reservation_id uuid,p_success boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF payment_private.jwt_role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'server only' USING ERRCODE='42501'; END IF;
  UPDATE payment_private.notification_outbox SET state=CASE WHEN p_success THEN 'sent' ELSE 'review' END,updated_at=now()
    WHERE reservation_id=p_reservation_id AND state='sending';
END $$;

-- An isolated no-login code owner gives future payment functions safe defaults,
-- without changing global defaults for unrelated application functions.
CREATE ROLE damda_payment_code NOLOGIN NOINHERIT;
-- PostgreSQL 16+ CREATEROLE grants ADMIN only by default. The hosted migration
-- role also needs SET/INHERIT for default privileges and ownership transfers.
GRANT damda_payment_code TO CURRENT_USER WITH INHERIT TRUE, SET TRUE;
ALTER DEFAULT PRIVILEGES FOR ROLE damda_payment_code REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
GRANT USAGE ON SCHEMA public,payment_private TO damda_payment_code;
GRANT CREATE ON SCHEMA payment_private TO damda_payment_code;
-- Needed for ownership transfer by the hosted non-superuser migration role.
GRANT CREATE ON SCHEMA public TO damda_payment_code;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA payment_private TO damda_payment_code;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA payment_private TO damda_payment_code;
GRANT SELECT ON public.admins,public.notification_logs TO damda_payment_code;
-- Existing reservation triggers read the product/business mapping and auto-confirm preference.
GRANT SELECT ON public.products,public.business_place_profiles TO damda_payment_code;
-- During preparation the existing notification trigger is still SECURITY INVOKER.
-- Its pg_net call runs as the new materializer's owner. Do not rely on pg_net's
-- installation-time PUBLIC grants, or change the existing trigger body/ACL.
DO $$ DECLARE post_function oid; queue_sequence text; helper text; BEGIN
  IF EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.notify_reservation_event()')
    AND NOT prosecdef AND prosrc ~* 'net[.]http_post') THEN
    IF to_regnamespace('net') IS NULL THEN RAISE EXCEPTION 'legacy notification requires pg_net before payment preparation'; END IF;
    post_function := to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)');
    IF post_function IS NULL THEN RAISE EXCEPTION 'legacy notification pg_net http_post signature is unavailable'; END IF;
    GRANT USAGE ON SCHEMA net TO damda_payment_code;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO damda_payment_code',post_function::regprocedure);
    -- Supabase owns pg_net objects and may expose them through PUBLIC without
    -- granting postgres a grant option. A warning/no-op GRANT is not readiness.
    IF NOT has_schema_privilege('damda_payment_code','net','USAGE')
      OR NOT has_function_privilege('damda_payment_code',post_function,'EXECUTE') THEN
      RAISE EXCEPTION 'payment code owner cannot execute legacy notification pg_net call';
    END IF;
    IF NOT (SELECT prosecdef FROM pg_proc WHERE oid=post_function) THEN
      IF to_regclass('net.http_request_queue') IS NULL THEN RAISE EXCEPTION 'pg_net request queue is unavailable'; END IF;
      GRANT INSERT(method,url,headers,body,timeout_milliseconds), SELECT(id) ON net.http_request_queue TO damda_payment_code;
      queue_sequence := pg_get_serial_sequence('net.http_request_queue','id');
      IF queue_sequence IS NULL THEN RAISE EXCEPTION 'pg_net request sequence is unavailable'; END IF;
      EXECUTE format('GRANT USAGE ON SEQUENCE %s TO damda_payment_code',queue_sequence);
      IF NOT has_column_privilege('damda_payment_code','net.http_request_queue','id','SELECT')
        OR NOT has_column_privilege('damda_payment_code','net.http_request_queue','method','INSERT')
        OR NOT has_column_privilege('damda_payment_code','net.http_request_queue','url','INSERT')
        OR NOT has_column_privilege('damda_payment_code','net.http_request_queue','headers','INSERT')
        OR NOT has_column_privilege('damda_payment_code','net.http_request_queue','body','INSERT')
        OR NOT has_column_privilege('damda_payment_code','net.http_request_queue','timeout_milliseconds','INSERT')
        OR NOT has_sequence_privilege('damda_payment_code',queue_sequence,'USAGE') THEN
        RAISE EXCEPTION 'payment code owner lacks legacy notification pg_net queue access';
      END IF;
      FOREACH helper IN ARRAY ARRAY['net._urlencode_string(character varying)',
        'net._encode_url_with_params_array(text,text[])','net.wake()'] LOOP
        IF to_regprocedure(helper) IS NOT NULL THEN
          EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO damda_payment_code',to_regprocedure(helper));
          IF NOT has_function_privilege('damda_payment_code',to_regprocedure(helper),'EXECUTE') THEN
            RAISE EXCEPTION 'payment code owner lacks legacy notification pg_net helper access';
          END IF;
        END IF;
      END LOOP;
    END IF;
  END IF;
END $$;
CREATE POLICY payment_code_read ON public.products FOR SELECT TO damda_payment_code USING (true);
CREATE POLICY payment_code_read ON public.business_place_profiles FOR SELECT TO damda_payment_code USING (true);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.payment_orders,public.reservations,public.payments,public.reservation_options,public.reservation_holds TO damda_payment_code;

-- RLS is scoped to the non-login function owner; it cannot be assumed by API roles.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['admins','notification_logs','payment_orders','reservations','payments','reservation_options','reservation_holds'] LOOP
    EXECUTE format('CREATE POLICY payment_code_access ON public.%I FOR ALL TO damda_payment_code USING (true) WITH CHECK (true)',t);
  END LOOP;
END $$;
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature,n.nspname,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='payment_private' OR (n.nspname='public' AND p.proname IN
      ('create_verified_payment_order','finalize_verified_payment','register_payment_authentication','claim_payment_approval','record_payment_review','claim_payment_notification','finish_payment_notification')) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
    IF f.proname='create_verified_payment_order' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
    ELSIF f.nspname='public' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
    END IF;
    EXECUTE format('ALTER FUNCTION %s OWNER TO damda_payment_code',f.signature);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.create_secure_payment_order(jsonb,jsonb,text) TO damda_payment_code;
REVOKE CREATE ON SCHEMA public FROM damda_payment_code;
COMMIT;
