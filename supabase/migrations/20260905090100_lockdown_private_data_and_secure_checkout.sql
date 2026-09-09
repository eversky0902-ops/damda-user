-- P0 security hardening: private data must never be readable or mutable by anon.
-- Checkout orders are persisted server-side so browser-provided prices cannot be trusted.

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    WHERE a.is_active = true
      AND a.id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;

-- Remove policies which expose organisation, reservation, payment, refund, and inquiry data.
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.daycares;
DROP POLICY IF EXISTS "Admins can insert daycares" ON public.daycares;
DROP POLICY IF EXISTS "Admins can update all daycares" ON public.daycares;
DROP POLICY IF EXISTS "Admins can view all daycares" ON public.daycares;
DROP POLICY IF EXISTS "Allow signup insert" ON public.daycares;

DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.reservations;
DROP POLICY IF EXISTS "Allow anon update for admin app" ON public.reservations;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.reservation_options;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.payments;
DROP POLICY IF EXISTS "Allow anon update for admin app" ON public.payments;
DROP POLICY IF EXISTS "Allow anon insert for admin app" ON public.refunds;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.refunds;
DROP POLICY IF EXISTS "Allow anon update for admin app" ON public.refunds;

DROP POLICY IF EXISTS "Allow all for authenticated users on business_owner_documents" ON public.business_owner_documents;
DROP POLICY IF EXISTS "Admins can delete daycare_memos" ON public.daycare_memos;
DROP POLICY IF EXISTS "Admins can insert daycare_memos" ON public.daycare_memos;
DROP POLICY IF EXISTS "Admins can view all daycare_memos" ON public.daycare_memos;
DROP POLICY IF EXISTS "Allow delete partner inquiries" ON public.partner_inquiries;
DROP POLICY IF EXISTS "Allow update partner inquiries" ON public.partner_inquiries;
DROP POLICY IF EXISTS "Users can view own inquiries" ON public.partner_inquiries;

-- The consumer service is closed. Catalogue data is available only to signed-in daycare users.
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.business_owners;
DROP POLICY IF EXISTS "Allow public read access to business_owners" ON public.business_owners;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.businesses;
DROP POLICY IF EXISTS "Allow public read access to businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.products;
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
DROP POLICY IF EXISTS "Daycares can view visible products" ON public.products;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.product_options;
DROP POLICY IF EXISTS "Allow public read access to product_options" ON public.product_options;
DROP POLICY IF EXISTS "Users can view product options" ON public.product_options;
DROP POLICY IF EXISTS "Allow public read access to product_images" ON public.product_images;
DROP POLICY IF EXISTS "Users can view product images" ON public.product_images;
DROP POLICY IF EXISTS "Allow public read access to product_unavailable_dates" ON public.product_unavailable_dates;
DROP POLICY IF EXISTS "Users can view unavailable dates" ON public.product_unavailable_dates;

CREATE POLICY "Admins manage daycares" ON public.daycares FOR ALL TO authenticated
  USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());
CREATE POLICY "Admins manage daycare memos" ON public.daycare_memos FOR ALL TO authenticated
  USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());
CREATE POLICY "Admins manage partner inquiries" ON public.partner_inquiries FOR ALL TO authenticated
  USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());
CREATE POLICY "Admins manage business owner documents" ON public.business_owner_documents FOR ALL TO authenticated
  USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

CREATE POLICY "Business owners manage own documents" ON public.business_owner_documents FOR ALL TO authenticated
  USING (business_owner_id = public.current_business_owner_id())
  WITH CHECK (business_owner_id = public.current_business_owner_id());

CREATE POLICY "Approved daycares view active business owners" ON public.business_owners FOR SELECT TO authenticated
  USING (status = 'active' AND public.is_daycare());
CREATE POLICY "Approved daycares view visible businesses" ON public.businesses FOR SELECT TO authenticated
  USING (is_visible = true AND public.is_daycare());
CREATE POLICY "Authenticated users view permitted products" ON public.products FOR SELECT TO authenticated
  USING (
    (is_visible = true AND public.is_daycare())
    OR business_owner_id = public.current_business_owner_id()
  );
CREATE POLICY "Authenticated users view permitted product options" ON public.product_options FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_options.product_id
      AND ((p.is_visible = true AND public.is_daycare()) OR p.business_owner_id = public.current_business_owner_id())
  ));
CREATE POLICY "Authenticated users view permitted product images" ON public.product_images FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND ((p.is_visible = true AND public.is_daycare()) OR p.business_owner_id = public.current_business_owner_id())
  ));
CREATE POLICY "Authenticated users view permitted unavailable dates" ON public.product_unavailable_dates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_unavailable_dates.product_id
      AND ((p.is_visible = true AND public.is_daycare()) OR p.business_owner_id = public.current_business_owner_id())
  ));

-- Pending members receive a session at signup; no anonymous insert policy is needed.
CREATE POLICY "Authenticated users create own daycare profile" ON public.daycares FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.find_masked_daycare_email(p_name text, p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_local text;
  v_domain text;
  v_phone text := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
BEGIN
  IF length(trim(COALESCE(p_name, ''))) < 1 OR length(v_phone) NOT BETWEEN 10 AND 11 THEN
    RETURN NULL;
  END IF;
  SELECT email INTO v_email
  FROM public.daycares
  WHERE name = trim(p_name)
    AND regexp_replace(contact_phone, '[^0-9]', '', 'g') = v_phone
  LIMIT 1;
  IF v_email IS NULL OR position('@' IN v_email) = 0 THEN
    RETURN NULL;
  END IF;
  v_local := split_part(v_email, '@', 1);
  v_domain := split_part(v_email, '@', 2);
  RETURN CASE WHEN length(v_local) <= 2 THEN left(v_local, 1) || '*' ELSE left(v_local, 2) || repeat('*', length(v_local) - 2) END || '@' || v_domain;
END;
$$;

REVOKE ALL ON FUNCTION public.find_masked_daycare_email(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_masked_daycare_email(text, text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  daycare_id uuid NOT NULL REFERENCES public.daycares(id),
  items jsonb NOT NULL,
  reserver_info jsonb NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('card', 'bank')),
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  pg_tid text UNIQUE,
  reservation_ids uuid[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_orders_daycare_id_idx ON public.payment_orders(daycare_id);
CREATE INDEX IF NOT EXISTS payment_orders_status_idx ON public.payment_orders(status);
DROP TRIGGER IF EXISTS update_payment_orders_updated_at ON public.payment_orders;
CREATE TRIGGER update_payment_orders_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daycares view own payment orders" ON public.payment_orders FOR SELECT TO authenticated
  USING (daycare_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_secure_payment_order(
  p_items jsonb,
  p_reserver_info jsonb,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daycare_id uuid := auth.uid();
  v_item jsonb;
  v_option_input jsonb;
  v_product public.products%ROWTYPE;
  v_option public.product_options%ROWTYPE;
  v_product_id uuid;
  v_reserved_date date;
  v_participants integer;
  v_quantity integer;
  v_item_total integer;
  v_total integer := 0;
  v_snapshot jsonb := '[]'::jsonb;
  v_options jsonb;
  v_order_id text;
  v_goods_name text;
  v_item_count integer := 0;
BEGIN
  IF v_daycare_id IS NULL OR NOT public.is_daycare() THEN
    RAISE EXCEPTION '승인된 보육기관 회원만 결제할 수 있습니다.';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 20 THEN
    RAISE EXCEPTION '주문 상품 정보가 올바르지 않습니다.';
  END IF;
  IF p_payment_method NOT IN ('card', 'bank') THEN
    RAISE EXCEPTION '결제수단이 올바르지 않습니다.';
  END IF;
  IF NULLIF(trim(COALESCE(p_reserver_info ->> 'name', '')), '') IS NULL
     OR NULLIF(trim(COALESCE(p_reserver_info ->> 'phone', '')), '') IS NULL THEN
    RAISE EXCEPTION '예약자 정보가 올바르지 않습니다.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item ->> 'productId', '')::uuid;
    v_reserved_date := NULLIF(v_item ->> 'reservedDate', '')::date;
    v_participants := (v_item ->> 'participants')::integer;
    IF v_product_id IS NULL OR v_reserved_date IS NULL OR v_participants IS NULL OR v_participants < 1 THEN
      RAISE EXCEPTION '상품 또는 예약 인원 정보가 올바르지 않습니다.';
    END IF;
    SELECT * INTO v_product FROM public.products WHERE id = v_product_id FOR SHARE;
    IF NOT FOUND OR NOT v_product.is_visible OR v_product.is_sold_out THEN
      RAISE EXCEPTION '예약할 수 없는 상품입니다.';
    END IF;
    IF v_reserved_date < CURRENT_DATE OR v_participants < v_product.min_participants OR v_participants > v_product.max_participants THEN
      RAISE EXCEPTION '예약 날짜 또는 인원이 상품 조건에 맞지 않습니다.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.product_unavailable_dates u
      WHERE u.product_id = v_product_id AND u.unavailable_date = v_reserved_date
    ) THEN
      RAISE EXCEPTION '선택한 날짜는 예약할 수 없습니다.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.reservation_holds h
      WHERE h.product_id = v_product_id
        AND h.reserved_date = v_reserved_date
        AND h.daycare_id = v_daycare_id
        AND h.expires_at > now()
    ) THEN
      RAISE EXCEPTION '결제 대기 시간이 만료되었습니다. 다시 시도해주세요.';
    END IF;

    v_item_total := v_product.sale_price * v_participants;
    v_options := '[]'::jsonb;
    FOR v_option_input IN SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'options', '[]'::jsonb))
    LOOP
      v_quantity := (v_option_input ->> 'quantity')::integer;
      IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 100 THEN
        RAISE EXCEPTION '옵션 수량이 올바르지 않습니다.';
      END IF;
      SELECT * INTO v_option FROM public.product_options
      WHERE id = NULLIF(v_option_input ->> 'id', '')::uuid AND product_id = v_product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION '상품 옵션 정보가 올바르지 않습니다.';
      END IF;
      v_item_total := v_item_total + (v_option.price * v_quantity);
      v_options := v_options || jsonb_build_array(jsonb_build_object(
        'id', v_option.id, 'name', v_option.name, 'price', v_option.price, 'quantity', v_quantity
      ));
    END LOOP;

    v_snapshot := v_snapshot || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id,
      'productName', v_product.name,
      'businessOwnerId', v_product.business_owner_id,
      'reservedDate', v_reserved_date,
      'reservedTime', NULLIF(v_item ->> 'reservedTime', ''),
      'participants', v_participants,
      'options', v_options,
      'totalAmount', v_item_total
    ));
    v_total := v_total + v_item_total;
    v_item_count := v_item_count + 1;
    IF v_item_count = 1 THEN v_goods_name := v_product.name; END IF;
  END LOOP;

  v_order_id := 'ORD' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.payment_orders(order_id, daycare_id, items, reserver_info, payment_method, amount)
  VALUES (v_order_id, v_daycare_id, v_snapshot, p_reserver_info, p_payment_method, v_total);
  RETURN jsonb_build_object(
    'orderId', v_order_id,
    'amount', v_total,
    'goodsName', CASE WHEN v_item_count > 1 THEN v_goods_name || ' 외 ' || (v_item_count - 1) || '건' ELSE v_goods_name END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_secure_payment_order(
  p_order_id text,
  p_tid text,
  p_paid_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daycare_id uuid := auth.uid();
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
  IF v_daycare_id IS NULL OR NOT public.is_daycare() THEN
    RAISE EXCEPTION '인증되지 않은 결제 요청입니다.';
  END IF;
  SELECT * INTO v_order FROM public.payment_orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.daycare_id <> v_daycare_id THEN
    RAISE EXCEPTION '주문 정보를 찾을 수 없습니다.';
  END IF;
  IF v_order.status = 'paid' THEN
    RETURN jsonb_build_object('orderId', v_order.order_id, 'reservationIds', v_order.reservation_ids, 'idempotent', true);
  END IF;
  IF v_order.status <> 'pending' OR v_order.expires_at < now() OR v_order.amount <> p_paid_amount THEN
    RAISE EXCEPTION '결제 금액 또는 주문 상태가 올바르지 않습니다.';
  END IF;
  IF p_tid IS NULL OR length(trim(p_tid)) = 0 THEN
    RAISE EXCEPTION '결제 거래번호가 올바르지 않습니다.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_order.items)
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
      v_reservation_number, v_daycare_id, v_product_id, (v_item ->> 'businessOwnerId')::uuid,
      v_reserved_date, NULLIF(v_item ->> 'reservedTime', '')::time,
      (v_item ->> 'participants')::integer, v_item_amount, 'confirmed',
      NULLIF(v_order.reserver_info ->> 'name', ''), NULLIF(v_order.reserver_info ->> 'phone', ''),
      NULLIF(v_order.reserver_info ->> 'email', '')
    ) RETURNING id INTO v_reservation_id;
    FOR v_option IN SELECT value FROM jsonb_array_elements(v_item -> 'options')
    LOOP
      INSERT INTO public.reservation_options(reservation_id, product_option_id, quantity, unit_price, subtotal)
      VALUES (
        v_reservation_id, (v_option ->> 'id')::uuid, (v_option ->> 'quantity')::integer,
        (v_option ->> 'price')::integer, (v_option ->> 'price')::integer * (v_option ->> 'quantity')::integer
      );
    END LOOP;
    INSERT INTO public.payments(reservation_id, pg_provider, pg_tid, payment_method, amount, status, paid_at)
    VALUES (v_reservation_id, 'nicepay', p_tid, v_order.payment_method, v_item_amount, 'paid', now());
    v_reservation_ids := array_append(v_reservation_ids, v_reservation_id);
  END LOOP;

  UPDATE public.payment_orders
  SET status = 'paid', pg_tid = p_tid, reservation_ids = v_reservation_ids
  WHERE id = v_order.id;
  DELETE FROM public.reservation_holds WHERE daycare_id = v_daycare_id AND (product_id, reserved_date) IN (
    SELECT (value ->> 'productId')::uuid, (value ->> 'reservedDate')::date FROM jsonb_array_elements(v_order.items)
  );
  RETURN jsonb_build_object('orderId', v_order.order_id, 'reservationIds', v_reservation_ids, 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION public.create_secure_payment_order(jsonb, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_secure_payment_order(jsonb, jsonb, text) TO authenticated;
REVOKE ALL ON FUNCTION public.finalize_secure_payment_order(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_secure_payment_order(text, text, integer) TO authenticated;

-- The browser must never write paid reservations or payments directly.
DROP POLICY IF EXISTS "Daycares can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Daycares can update own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Daycares can insert payments for own reservations" ON public.payments;
DROP POLICY IF EXISTS "Daycares can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Daycares can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Daycares can view own refunds" ON public.refunds;
DROP POLICY IF EXISTS "Users can view reservation options" ON public.reservation_options;

CREATE POLICY "Daycares view own reservations" ON public.reservations FOR SELECT TO authenticated
  USING (daycare_id = auth.uid());
CREATE POLICY "Daycares view own payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = payments.reservation_id AND r.daycare_id = auth.uid()));
CREATE POLICY "Daycares view own refunds" ON public.refunds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = refunds.reservation_id AND r.daycare_id = auth.uid()));
CREATE POLICY "Daycares view own reservation options" ON public.reservation_options FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_options.reservation_id AND r.daycare_id = auth.uid()));
