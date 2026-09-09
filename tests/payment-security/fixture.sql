CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TABLE public.daycares(id uuid PRIMARY KEY);
CREATE TABLE public.business_owners(id uuid PRIMARY KEY);
CREATE TABLE public.products(id uuid PRIMARY KEY, business_id uuid, business_owner_id uuid);
CREATE TABLE public.product_options(id uuid PRIMARY KEY);
CREATE TABLE public.admins(id uuid PRIMARY KEY,is_active boolean);
CREATE TABLE public.notification_logs(reference_id uuid,recipient_type text,notification_type text,status text);
CREATE TABLE public.reservation_holds(daycare_id uuid,product_id uuid,reserved_date date);
CREATE TABLE public.business_place_profiles(business_owner_id uuid,auto_confirm_reservations boolean);
-- 예약 테이블
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number varchar(20) NOT NULL,
  daycare_id uuid NOT NULL REFERENCES daycares(id),
  product_id uuid NOT NULL REFERENCES products(id),
  business_owner_id uuid NOT NULL REFERENCES business_owners(id),
  reserved_date date NOT NULL,
  reserved_time time,
  participant_count integer NOT NULL,
  total_amount integer NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed', 'completed', 'cancelled', 'refunded')),
  memo text,
  cancel_reason text,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX reservations_reservation_number_unique ON reservations(reservation_number);
CREATE INDEX reservations_daycare_id_idx ON reservations(daycare_id);
CREATE INDEX reservations_product_id_idx ON reservations(product_id);
CREATE INDEX reservations_business_owner_id_idx ON reservations(business_owner_id);
CREATE INDEX reservations_status_idx ON reservations(status);
CREATE INDEX reservations_reserved_date_idx ON reservations(reserved_date);

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE reservations IS '체험 예약';

-- 예약 옵션 상세 테이블
CREATE TABLE reservation_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  product_option_id uuid NOT NULL REFERENCES product_options(id),
  quantity integer NOT NULL,
  unit_price integer NOT NULL,
  subtotal integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reservation_options_reservation_id_idx ON reservation_options(reservation_id);

COMMENT ON TABLE reservation_options IS '예약 옵션 상세';

-- 결제 테이블
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  pg_provider varchar(50) NOT NULL,
  pg_tid varchar(100),
  payment_method varchar(50) NOT NULL,
  amount integer NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  paid_at timestamptz,
  receipt_url text,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_reservation_id_idx ON payments(reservation_id);
CREATE INDEX payments_pg_tid_idx ON payments(pg_tid);
CREATE INDEX payments_status_idx ON payments(status);

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE payments IS 'PG 결제';


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


ALTER TABLE public.reservations ALTER COLUMN reservation_number TYPE text;
ALTER TABLE public.reservations ADD COLUMN reserver_name text, ADD COLUMN reserver_phone text, ADD COLUMN reserver_email text, ADD COLUMN business_id uuid;
CREATE FUNCTION public.notify_reservation_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER tr_reservation_alimtalk AFTER INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.notify_reservation_event();
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
-- Deliberately permissive legacy policies to prove trigger protection through definer wrappers.
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY legacy_all ON public.reservations FOR ALL USING(true) WITH CHECK(true);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY legacy_all ON public.payments FOR ALL USING(true) WITH CHECK(true);
CREATE POLICY legacy_all ON public.payment_orders FOR ALL USING(true) WITH CHECK(true);
CREATE TABLE public.settlements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_owner_id uuid,business_id uuid,settlement_period_start date,settlement_period_end date,total_sales integer,settlement_amount integer,status text DEFAULT 'pending');

-- Actual server-price creator from the deployed checkout migration, with catalog prerequisites.
ALTER TABLE products ADD COLUMN name text DEFAULT 'Fixture', ADD COLUMN sale_price integer DEFAULT 1000,
  ADD COLUMN is_visible boolean DEFAULT true, ADD COLUMN is_sold_out boolean DEFAULT false,
  ADD COLUMN min_participants integer DEFAULT 1, ADD COLUMN max_participants integer DEFAULT 20;
ALTER TABLE product_options ADD COLUMN product_id uuid, ADD COLUMN name text, ADD COLUMN price integer;
CREATE TABLE product_unavailable_dates(product_id uuid,unavailable_date date);
ALTER TABLE reservation_holds ADD COLUMN expires_at timestamptz DEFAULT now()+interval '15 minutes';
CREATE FUNCTION public.is_daycare() RETURNS boolean LANGUAGE sql AS $$ SELECT auth.uid() IS NOT NULL $$;
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


REVOKE ALL ON FUNCTION public.create_secure_payment_order(jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_secure_payment_order(jsonb,jsonb,text) TO authenticated;
