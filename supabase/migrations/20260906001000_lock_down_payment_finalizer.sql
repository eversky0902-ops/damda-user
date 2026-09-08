REVOKE EXECUTE ON FUNCTION public.finalize_secure_payment_order(text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_secure_payment_order(text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finalize_secure_payment_order(text, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_secure_payment_order(text, text, integer) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS payments_pg_tid_unique
  ON public.payments (pg_tid) WHERE pg_tid IS NOT NULL;

CREATE OR REPLACE FUNCTION public.finalize_secure_payment_order(
  p_order_id text, p_tid text, p_paid_amount integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.payment_orders%ROWTYPE;
  v_item jsonb; v_option jsonb; v_reservation_id uuid;
  v_reservation_ids uuid[] := '{}'; v_product_id uuid; v_reserved_date date;
  v_item_amount integer; v_reservation_number text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION '서버 전용 결제 처리입니다.' USING ERRCODE = '42501';
  END IF;
  IF p_tid IS NULL OR length(trim(p_tid)) = 0 OR length(p_tid) > 100 THEN
    RAISE EXCEPTION '결제 거래번호가 올바르지 않습니다.';
  END IF;
  SELECT * INTO v_order FROM public.payment_orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '주문 정보를 찾을 수 없습니다.'; END IF;
  IF v_order.status = 'paid' THEN
    IF v_order.pg_tid = p_tid THEN
      RETURN jsonb_build_object('orderId', v_order.order_id, 'reservationIds', v_order.reservation_ids, 'idempotent', true);
    END IF;
    RAISE EXCEPTION '이미 다른 결제 거래번호로 완료된 주문입니다.';
  END IF;
  IF v_order.status <> 'pending' OR v_order.expires_at < now() OR v_order.amount <> p_paid_amount THEN
    RAISE EXCEPTION '결제 금액 또는 주문 상태가 올바르지 않습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payment_orders WHERE pg_tid = p_tid)
     OR EXISTS (SELECT 1 FROM public.payments WHERE pg_tid = p_tid) THEN
    RAISE EXCEPTION '이미 처리된 결제 거래번호입니다.';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_order.items) LOOP
    v_product_id := (v_item ->> 'productId')::uuid;
    v_reserved_date := (v_item ->> 'reservedDate')::date;
    v_item_amount := (v_item ->> 'totalAmount')::integer;
    PERFORM pg_advisory_xact_lock(hashtext(v_product_id::text || ':' || v_reserved_date::text));
    IF EXISTS (SELECT 1 FROM public.reservations r WHERE r.product_id = v_product_id AND r.reserved_date = v_reserved_date AND r.status IN ('pending', 'paid', 'confirmed')) THEN
      RAISE EXCEPTION '다른 예약으로 선택한 일정이 마감되었습니다.';
    END IF;
    v_reservation_number := 'RES' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    INSERT INTO public.reservations(reservation_number, daycare_id, product_id, business_owner_id, reserved_date, reserved_time, participant_count, total_amount, status, reserver_name, reserver_phone, reserver_email)
    VALUES (v_reservation_number, v_order.daycare_id, v_product_id, (v_item ->> 'businessOwnerId')::uuid, v_reserved_date, NULLIF(v_item ->> 'reservedTime', '')::time, (v_item ->> 'participants')::integer, v_item_amount, 'confirmed', NULLIF(v_order.reserver_info ->> 'name', ''), NULLIF(v_order.reserver_info ->> 'phone', ''), NULLIF(v_order.reserver_info ->> 'email', ''))
    RETURNING id INTO v_reservation_id;
    FOR v_option IN SELECT value FROM jsonb_array_elements(v_item -> 'options') LOOP
      INSERT INTO public.reservation_options(reservation_id, product_option_id, quantity, unit_price, subtotal)
      VALUES (v_reservation_id, (v_option ->> 'id')::uuid, (v_option ->> 'quantity')::integer, (v_option ->> 'price')::integer, (v_option ->> 'price')::integer * (v_option ->> 'quantity')::integer);
    END LOOP;
    INSERT INTO public.payments(reservation_id, pg_provider, pg_tid, payment_method, amount, status, paid_at)
    VALUES (v_reservation_id, 'nicepay', p_tid, v_order.payment_method, v_item_amount, 'paid', now());
    v_reservation_ids := array_append(v_reservation_ids, v_reservation_id);
  END LOOP;
  UPDATE public.payment_orders SET status = 'paid', pg_tid = p_tid, reservation_ids = v_reservation_ids WHERE id = v_order.id;
  DELETE FROM public.reservation_holds WHERE daycare_id = v_order.daycare_id AND (product_id, reserved_date) IN (SELECT (value ->> 'productId')::uuid, (value ->> 'reservedDate')::date FROM jsonb_array_elements(v_order.items));
  RETURN jsonb_build_object('orderId', v_order.order_id, 'reservationIds', v_reservation_ids, 'idempotent', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_secure_payment_order(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_secure_payment_order(text, text, integer) TO service_role;
