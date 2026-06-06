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

-- 환불 테이블
CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  original_amount integer NOT NULL,
  refund_amount integer NOT NULL,
  reason text,
  admin_memo text,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  refunded_at timestamptz,
  processed_by uuid REFERENCES admins(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refunds_payment_id_idx ON refunds(payment_id);
CREATE INDEX refunds_reservation_id_idx ON refunds(reservation_id);

COMMENT ON TABLE refunds IS '환불 처리';

-- 정산 테이블
CREATE TABLE settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES business_owners(id),
  settlement_period_start date NOT NULL,
  settlement_period_end date NOT NULL,
  total_sales integer NOT NULL,
  commission_amount integer NOT NULL,
  commission_rate decimal(5,2) NOT NULL,
  refund_amount integer NOT NULL DEFAULT 0,
  settlement_amount integer NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX settlements_business_owner_id_idx ON settlements(business_owner_id);
CREATE INDEX settlements_status_idx ON settlements(status);
CREATE INDEX settlements_period_start_idx ON settlements(settlement_period_start);

COMMENT ON TABLE settlements IS '사업주 정산';
