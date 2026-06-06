-- ===== 20251231082831 create_admins_table =====
-- 관리자 테이블
CREATE TABLE admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  name varchar(100) NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE UNIQUE INDEX admins_email_unique ON admins(email);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE admins IS '관리자';

-- ===== 20251231082902 create_daycares_table =====
-- 어린이집 (회원) 테이블
CREATE TABLE daycares (
  id uuid PRIMARY KEY, -- Supabase Auth uid 연동
  email varchar(255) NOT NULL,
  name varchar(200) NOT NULL,
  representative varchar(100),
  contact_name varchar(100) NOT NULL,
  contact_phone varchar(20) NOT NULL,
  business_number varchar(20),
  license_number varchar(50) NOT NULL,
  license_file text NOT NULL,
  address varchar(500) NOT NULL,
  address_detail varchar(200),
  zipcode varchar(10),
  tel varchar(20),
  capacity integer,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'requested', 'approved', 'rejected')),
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE UNIQUE INDEX daycares_email_unique ON daycares(email);
CREATE INDEX daycares_license_number_idx ON daycares(license_number);
CREATE INDEX daycares_status_idx ON daycares(status);
CREATE INDEX daycares_created_at_idx ON daycares(created_at);

-- updated_at 트리거
CREATE TRIGGER update_daycares_updated_at
  BEFORE UPDATE ON daycares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE daycares IS '어린이집 (회원)';

-- ===== 20251231082927 create_business_owners_table =====
-- 사업주 테이블
CREATE TABLE business_owners (
  id uuid PRIMARY KEY, -- Supabase Auth uid 연동
  email varchar(255) NOT NULL,
  name varchar(200) NOT NULL,
  business_number varchar(20) NOT NULL,
  representative varchar(100) NOT NULL,
  contact_name varchar(100) NOT NULL,
  contact_phone varchar(20) NOT NULL,
  address varchar(500) NOT NULL,
  address_detail varchar(200),
  zipcode varchar(10),
  latitude decimal(10,7),
  longitude decimal(10,7),
  bank_name varchar(50),
  bank_account varchar(50),
  bank_holder varchar(100),
  commission_rate decimal(5,2) NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 5 AND commission_rate <= 15),
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE UNIQUE INDEX business_owners_email_unique ON business_owners(email);
CREATE UNIQUE INDEX business_owners_business_number_unique ON business_owners(business_number);
CREATE INDEX business_owners_status_idx ON business_owners(status);

-- updated_at 트리거
CREATE TRIGGER update_business_owners_updated_at
  BEFORE UPDATE ON business_owners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE business_owners IS '사업주';

-- 수수료 변경 이력 테이블
CREATE TABLE commission_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  previous_rate decimal(5,2) NOT NULL,
  new_rate decimal(5,2) NOT NULL,
  effective_date date NOT NULL,
  changed_by uuid REFERENCES admins(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX commission_histories_business_owner_id_idx ON commission_histories(business_owner_id);

COMMENT ON TABLE commission_histories IS '수수료 변경 이력';

-- ===== 20251231082958 create_categories_products_tables =====
-- 카테고리 테이블 (셀프 참조)
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  depth integer NOT NULL CHECK (depth >= 1 AND depth <= 3),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX categories_parent_id_idx ON categories(parent_id);
CREATE INDEX categories_depth_idx ON categories(depth);
CREATE INDEX categories_sort_order_idx ON categories(sort_order);

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE categories IS '카테고리 (3단계 계층)';

-- 상품 테이블
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  name varchar(200) NOT NULL,
  summary varchar(500),
  description text,
  thumbnail text NOT NULL,
  original_price integer NOT NULL,
  sale_price integer NOT NULL,
  min_participants integer NOT NULL DEFAULT 1,
  max_participants integer NOT NULL,
  duration_minutes integer,
  address varchar(500),
  latitude decimal(10,7),
  longitude decimal(10,7),
  region varchar(50),
  available_time_slots jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  is_sold_out boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_business_owner_id_idx ON products(business_owner_id);
CREATE INDEX products_category_id_idx ON products(category_id);
CREATE INDEX products_is_visible_idx ON products(is_visible);
CREATE INDEX products_region_idx ON products(region);
CREATE INDEX products_created_at_idx ON products(created_at);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE products IS '체험 상품';

-- 상품 이미지 테이블
CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_images_product_id_idx ON product_images(product_id);

COMMENT ON TABLE product_images IS '상품 추가 이미지';

-- 상품 옵션 테이블
CREATE TABLE product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  price integer NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_options_product_id_idx ON product_options(product_id);

COMMENT ON TABLE product_options IS '상품 옵션 (인원별 가격 등)';

-- 예약 불가일 테이블
CREATE TABLE product_unavailable_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unavailable_date date NOT NULL,
  reason varchar(200),
  is_recurring boolean NOT NULL DEFAULT false,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_unavailable_dates_product_id_idx ON product_unavailable_dates(product_id);

COMMENT ON TABLE product_unavailable_dates IS '상품 예약 불가일';

-- ===== 20251231083052 create_reservations_payments_tables =====
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

-- ===== 20251231083129 create_reviews_wishlists_tables =====
-- 리뷰 테이블
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id),
  product_id uuid NOT NULL REFERENCES products(id),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviews_daycare_id_idx ON reviews(daycare_id);
CREATE INDEX reviews_product_id_idx ON reviews(product_id);
CREATE INDEX reviews_is_visible_idx ON reviews(is_visible);
CREATE INDEX reviews_is_featured_idx ON reviews(is_featured);

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE reviews IS '상품 리뷰';

-- 리뷰 이미지 테이블
CREATE TABLE review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX review_images_review_id_idx ON review_images(review_id);

COMMENT ON TABLE review_images IS '리뷰 첨부 이미지';

-- 찜 테이블
CREATE TABLE wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX wishlists_daycare_product_unique ON wishlists(daycare_id, product_id);

COMMENT ON TABLE wishlists IS '찜한 상품';

-- ===== 20251231083157 create_customer_support_tables =====
-- 1:1 문의 테이블
CREATE TABLE inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id),
  category varchar(50) NOT NULL,
  title varchar(200) NOT NULL,
  content text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  answer text,
  answered_by uuid REFERENCES admins(id),
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inquiries_daycare_id_idx ON inquiries(daycare_id);
CREATE INDEX inquiries_status_idx ON inquiries(status);
CREATE INDEX inquiries_created_at_idx ON inquiries(created_at);

COMMENT ON TABLE inquiries IS '1:1 문의';

-- 공지사항 테이블
CREATE TABLE notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(200) NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES admins(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_notices_updated_at
  BEFORE UPDATE ON notices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE notices IS '공지사항';

-- FAQ 테이블
CREATE TABLE faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category varchar(50) NOT NULL,
  question varchar(500) NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE faqs IS 'FAQ';

-- ===== 20251231083233 create_content_tables =====
-- 배너 테이블
CREATE TABLE banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(20) NOT NULL CHECK (type IN ('main', 'sub')),
  title varchar(200),
  image_url text NOT NULL,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE banners IS '배너';

-- 팝업 테이블
CREATE TABLE popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(200) NOT NULL,
  content text,
  image_url text,
  link_url text,
  position varchar(20) NOT NULL DEFAULT 'center' CHECK (position IN ('center', 'bottom')),
  width integer DEFAULT 400,
  height integer DEFAULT 300,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_popups_updated_at
  BEFORE UPDATE ON popups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE popups IS '팝업';

-- ===== 20251231083310 create_carts_logs_memos_tables =====
-- 장바구니 테이블
CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reserved_date date,
  reserved_time time,
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX carts_daycare_id_idx ON carts(daycare_id);

CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE carts IS '장바구니';

-- 관리자 활동 로그 테이블
CREATE TABLE admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id),
  action varchar(50) NOT NULL,
  target_type varchar(50) NOT NULL,
  target_id uuid NOT NULL,
  before_data jsonb,
  after_data jsonb,
  ip_address varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_logs_admin_id_idx ON admin_logs(admin_id);
CREATE INDEX admin_logs_action_idx ON admin_logs(action);
CREATE INDEX admin_logs_target_type_idx ON admin_logs(target_type);
CREATE INDEX admin_logs_created_at_idx ON admin_logs(created_at);

COMMENT ON TABLE admin_logs IS '관리자 활동 로그';

-- 어린이집 메모 테이블
CREATE TABLE daycare_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES admins(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX daycare_memos_daycare_id_idx ON daycare_memos(daycare_id);

COMMENT ON TABLE daycare_memos IS '어린이집 관리자 메모';

-- ===== 20251231083616 create_user_roles_and_helpers =====
-- 사용자 역할 테이블 (auth.users와 연동)
CREATE TABLE user_roles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role varchar(20) NOT NULL CHECK (role IN ('daycare', 'business_owner')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_roles_role_idx ON user_roles(role);

COMMENT ON TABLE user_roles IS '사용자 역할 (어린이집/사업주 구분)';

-- 현재 사용자 역할 조회 함수
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS varchar AS $$
  SELECT role FROM user_roles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 어린이집 여부 확인 함수
CREATE OR REPLACE FUNCTION is_daycare()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE id = auth.uid() AND role = 'daycare'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 사업주 여부 확인 함수
CREATE OR REPLACE FUNCTION is_business_owner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE id = auth.uid() AND role = 'business_owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===== 20251231083646 rls_daycares_business_owners =====
-- =====================
-- user_roles RLS
-- =====================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 본인 역할만 조회 가능
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  USING (id = auth.uid());

-- 회원가입 시 역할 생성 (insert는 트리거로 처리하거나 service_role 사용)

-- =====================
-- daycares RLS
-- =====================
ALTER TABLE daycares ENABLE ROW LEVEL SECURITY;

-- 본인 정보 조회
CREATE POLICY "Daycares can view own profile"
  ON daycares FOR SELECT
  USING (id = auth.uid());

-- 본인 정보 수정
CREATE POLICY "Daycares can update own profile"
  ON daycares FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 회원가입 시 생성 (본인 ID로만)
CREATE POLICY "Daycares can insert own profile"
  ON daycares FOR INSERT
  WITH CHECK (id = auth.uid());

-- =====================
-- business_owners RLS
-- =====================
ALTER TABLE business_owners ENABLE ROW LEVEL SECURITY;

-- 본인 정보 조회
CREATE POLICY "Business owners can view own profile"
  ON business_owners FOR SELECT
  USING (id = auth.uid());

-- 본인 정보 수정 (commission_rate는 수정 불가하도록 별도 처리 필요)
CREATE POLICY "Business owners can update own profile"
  ON business_owners FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 회원가입 시 생성
CREATE POLICY "Business owners can insert own profile"
  ON business_owners FOR INSERT
  WITH CHECK (id = auth.uid());

-- =====================
-- commission_histories RLS
-- =====================
ALTER TABLE commission_histories ENABLE ROW LEVEL SECURITY;

-- 사업주는 본인 수수료 이력만 조회
CREATE POLICY "Business owners can view own commission history"
  ON commission_histories FOR SELECT
  USING (business_owner_id = auth.uid());

-- ===== 20251231083722 rls_categories_products =====
-- =====================
-- categories RLS
-- =====================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 카테고리는 모든 인증된 사용자가 조회 가능 (is_active인 것만)
CREATE POLICY "Authenticated users can view active categories"
  ON categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- =====================
-- products RLS
-- =====================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 어린이집: 노출 중인 상품만 조회
CREATE POLICY "Daycares can view visible products"
  ON products FOR SELECT
  USING (
    is_visible = true 
    OR business_owner_id = auth.uid()
  );

-- 사업주: 본인 상품 생성
CREATE POLICY "Business owners can insert own products"
  ON products FOR INSERT
  WITH CHECK (business_owner_id = auth.uid() AND is_business_owner());

-- 사업주: 본인 상품 수정
CREATE POLICY "Business owners can update own products"
  ON products FOR UPDATE
  USING (business_owner_id = auth.uid())
  WITH CHECK (business_owner_id = auth.uid());

-- 사업주: 본인 상품 삭제
CREATE POLICY "Business owners can delete own products"
  ON products FOR DELETE
  USING (business_owner_id = auth.uid());

-- =====================
-- product_images RLS
-- =====================
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- 상품 이미지 조회 (상품 조회 권한 따라감)
CREATE POLICY "Users can view product images"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_images.product_id 
      AND (products.is_visible = true OR products.business_owner_id = auth.uid())
    )
  );

-- 사업주: 본인 상품 이미지 관리
CREATE POLICY "Business owners can manage own product images"
  ON product_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_images.product_id 
      AND products.business_owner_id = auth.uid()
    )
  );

-- =====================
-- product_options RLS
-- =====================
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;

-- 상품 옵션 조회
CREATE POLICY "Users can view product options"
  ON product_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_options.product_id 
      AND (products.is_visible = true OR products.business_owner_id = auth.uid())
    )
  );

-- 사업주: 본인 상품 옵션 관리
CREATE POLICY "Business owners can manage own product options"
  ON product_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_options.product_id 
      AND products.business_owner_id = auth.uid()
    )
  );

-- =====================
-- product_unavailable_dates RLS
-- =====================
ALTER TABLE product_unavailable_dates ENABLE ROW LEVEL SECURITY;

-- 예약 불가일 조회 (인증된 사용자)
CREATE POLICY "Users can view unavailable dates"
  ON product_unavailable_dates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_unavailable_dates.product_id 
      AND (products.is_visible = true OR products.business_owner_id = auth.uid())
    )
  );

-- 사업주: 본인 상품 예약 불가일 관리
CREATE POLICY "Business owners can manage own unavailable dates"
  ON product_unavailable_dates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_unavailable_dates.product_id 
      AND products.business_owner_id = auth.uid()
    )
  );

-- ===== 20251231083801 rls_reservations_payments =====
-- =====================
-- reservations RLS
-- =====================
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 어린이집: 본인 예약 조회
CREATE POLICY "Daycares can view own reservations"
  ON reservations FOR SELECT
  USING (daycare_id = auth.uid());

-- 사업주: 본인에게 들어온 예약 조회
CREATE POLICY "Business owners can view reservations for their products"
  ON reservations FOR SELECT
  USING (business_owner_id = auth.uid());

-- 어린이집: 예약 생성
CREATE POLICY "Daycares can create reservations"
  ON reservations FOR INSERT
  WITH CHECK (daycare_id = auth.uid() AND is_daycare());

-- 어린이집: 본인 예약 취소 (status만 변경)
CREATE POLICY "Daycares can update own reservations"
  ON reservations FOR UPDATE
  USING (daycare_id = auth.uid())
  WITH CHECK (daycare_id = auth.uid());

-- =====================
-- reservation_options RLS
-- =====================
ALTER TABLE reservation_options ENABLE ROW LEVEL SECURITY;

-- 예약 옵션 조회 (예약 조회 권한 따라감)
CREATE POLICY "Users can view reservation options"
  ON reservation_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = reservation_options.reservation_id 
      AND (reservations.daycare_id = auth.uid() OR reservations.business_owner_id = auth.uid())
    )
  );

-- 어린이집: 예약 시 옵션 추가
CREATE POLICY "Daycares can insert reservation options"
  ON reservation_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = reservation_options.reservation_id 
      AND reservations.daycare_id = auth.uid()
    )
  );

-- =====================
-- payments RLS
-- =====================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 어린이집: 본인 결제 조회
CREATE POLICY "Daycares can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = payments.reservation_id 
      AND reservations.daycare_id = auth.uid()
    )
  );

-- 사업주: 본인 상품 결제 조회
CREATE POLICY "Business owners can view payments for their products"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = payments.reservation_id 
      AND reservations.business_owner_id = auth.uid()
    )
  );

-- 결제 생성/수정은 서버에서 service_role로 처리

-- =====================
-- refunds RLS
-- =====================
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- 어린이집: 본인 환불 내역 조회
CREATE POLICY "Daycares can view own refunds"
  ON refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = refunds.reservation_id 
      AND reservations.daycare_id = auth.uid()
    )
  );

-- 사업주: 본인 상품 환불 내역 조회
CREATE POLICY "Business owners can view refunds for their products"
  ON refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = refunds.reservation_id 
      AND reservations.business_owner_id = auth.uid()
    )
  );

-- 환불 처리는 관리자가 service_role로

-- =====================
-- settlements RLS
-- =====================
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- 사업주: 본인 정산 내역 조회
CREATE POLICY "Business owners can view own settlements"
  ON settlements FOR SELECT
  USING (business_owner_id = auth.uid());

-- 정산 생성/수정은 관리자가 service_role로;

-- ===== 20251231083838 rls_reviews_wishlists_support =====
-- =====================
-- reviews RLS
-- =====================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 노출 중인 리뷰는 모두 조회 가능
CREATE POLICY "Anyone can view visible reviews"
  ON reviews FOR SELECT
  USING (is_visible = true OR daycare_id = auth.uid());

-- 어린이집: 본인 리뷰 작성
CREATE POLICY "Daycares can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (daycare_id = auth.uid() AND is_daycare());

-- 어린이집: 본인 리뷰 수정
CREATE POLICY "Daycares can update own reviews"
  ON reviews FOR UPDATE
  USING (daycare_id = auth.uid())
  WITH CHECK (daycare_id = auth.uid());

-- 어린이집: 본인 리뷰 삭제
CREATE POLICY "Daycares can delete own reviews"
  ON reviews FOR DELETE
  USING (daycare_id = auth.uid());

-- =====================
-- review_images RLS
-- =====================
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;

-- 리뷰 이미지 조회
CREATE POLICY "Anyone can view review images"
  ON review_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reviews 
      WHERE reviews.id = review_images.review_id 
      AND (reviews.is_visible = true OR reviews.daycare_id = auth.uid())
    )
  );

-- 어린이집: 본인 리뷰 이미지 관리
CREATE POLICY "Daycares can manage own review images"
  ON review_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM reviews 
      WHERE reviews.id = review_images.review_id 
      AND reviews.daycare_id = auth.uid()
    )
  );

-- =====================
-- wishlists RLS
-- =====================
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- 어린이집: 본인 찜 목록 조회
CREATE POLICY "Daycares can view own wishlists"
  ON wishlists FOR SELECT
  USING (daycare_id = auth.uid());

-- 어린이집: 찜 추가
CREATE POLICY "Daycares can add to wishlist"
  ON wishlists FOR INSERT
  WITH CHECK (daycare_id = auth.uid() AND is_daycare());

-- 어린이집: 찜 삭제
CREATE POLICY "Daycares can remove from wishlist"
  ON wishlists FOR DELETE
  USING (daycare_id = auth.uid());

-- =====================
-- inquiries RLS
-- =====================
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 어린이집: 본인 문의 조회
CREATE POLICY "Daycares can view own inquiries"
  ON inquiries FOR SELECT
  USING (daycare_id = auth.uid());

-- 어린이집: 문의 작성
CREATE POLICY "Daycares can create inquiries"
  ON inquiries FOR INSERT
  WITH CHECK (daycare_id = auth.uid() AND is_daycare());

-- =====================
-- notices RLS
-- =====================
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- 공지사항은 모든 인증된 사용자가 조회 가능
CREATE POLICY "Authenticated users can view visible notices"
  ON notices FOR SELECT
  TO authenticated
  USING (is_visible = true);

-- =====================
-- faqs RLS
-- =====================
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- FAQ는 모든 인증된 사용자가 조회 가능
CREATE POLICY "Authenticated users can view visible faqs"
  ON faqs FOR SELECT
  TO authenticated
  USING (is_visible = true);

-- ===== 20251231083858 rls_content_carts_admin =====
-- =====================
-- banners RLS
-- =====================
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- 배너는 모든 인증된 사용자가 조회 가능 (노출 기간 내)
CREATE POLICY "Authenticated users can view active banners"
  ON banners FOR SELECT
  TO authenticated
  USING (
    is_visible = true 
    AND (start_date IS NULL OR start_date <= now()) 
    AND (end_date IS NULL OR end_date >= now())
  );

-- =====================
-- popups RLS
-- =====================
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;

-- 팝업은 모든 인증된 사용자가 조회 가능 (노출 기간 내)
CREATE POLICY "Authenticated users can view active popups"
  ON popups FOR SELECT
  TO authenticated
  USING (
    is_visible = true 
    AND start_date <= now() 
    AND end_date >= now()
  );

-- =====================
-- carts RLS
-- =====================
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- 어린이집: 본인 장바구니 조회
CREATE POLICY "Daycares can view own cart"
  ON carts FOR SELECT
  USING (daycare_id = auth.uid());

-- 어린이집: 장바구니 추가
CREATE POLICY "Daycares can add to cart"
  ON carts FOR INSERT
  WITH CHECK (daycare_id = auth.uid() AND is_daycare());

-- 어린이집: 장바구니 수정
CREATE POLICY "Daycares can update own cart"
  ON carts FOR UPDATE
  USING (daycare_id = auth.uid())
  WITH CHECK (daycare_id = auth.uid());

-- 어린이집: 장바구니 삭제
CREATE POLICY "Daycares can remove from cart"
  ON carts FOR DELETE
  USING (daycare_id = auth.uid());

-- =====================
-- admins RLS (관리자는 service_role 사용, RLS 비활성화 상태 유지)
-- =====================
-- admins 테이블은 RLS 활성화하지 않음 (service_role로만 접근)

-- =====================
-- admin_logs RLS
-- =====================
-- admin_logs도 RLS 활성화하지 않음 (관리자 전용)

-- =====================
-- daycare_memos RLS
-- =====================
-- daycare_memos도 RLS 활성화하지 않음 (관리자 전용);

-- ===== 20251231084930 rename_admin_email_to_login_id =====
-- admins 테이블의 email 컬럼을 login_id로 변경
ALTER TABLE public.admins RENAME COLUMN email TO login_id;

-- 기존 데이터 삭제 (테스트 계정)
DELETE FROM public.admins WHERE login_id = 'admin@damda.com';

-- ===== 20260101015721 add_admin_rls_policies =====
-- 관리자용 RLS 정책 추가 (business_owners)
CREATE POLICY "Admins can view all business owners" ON business_owners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );

CREATE POLICY "Admins can update all business owners" ON business_owners
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );

CREATE POLICY "Admins can insert business owners" ON business_owners
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );

-- 관리자용 RLS 정책 추가 (settlements)
CREATE POLICY "Admins can view all settlements" ON settlements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );

-- 관리자용 RLS 정책 추가 (commission_histories)
CREATE POLICY "Admins can view all commission histories" ON commission_histories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );

CREATE POLICY "Admins can insert commission histories" ON commission_histories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );

-- ===== 20260101031020 add_business_owner_logo =====
-- 사업주 로고 필드 추가
ALTER TABLE business_owners 
ADD COLUMN logo_url text NULL;

COMMENT ON COLUMN business_owners.logo_url IS '사업주 로고 이미지 URL';

-- ===== 20260105021352 add_categories_admin_policies =====
-- 관리자용 categories 전체 권한 정책
-- 관리자는 모든 카테고리 조회 가능 (비활성 포함)
CREATE POLICY "Admins can view all categories" ON categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = (auth.jwt() -> 'user_metadata' ->> 'admin_id')::uuid
      AND admins.is_active = true
    )
  );

-- 관리자는 카테고리 생성 가능
CREATE POLICY "Admins can insert categories" ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = (auth.jwt() -> 'user_metadata' ->> 'admin_id')::uuid
      AND admins.is_active = true
    )
  );

-- 관리자는 카테고리 수정 가능
CREATE POLICY "Admins can update categories" ON categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = (auth.jwt() -> 'user_metadata' ->> 'admin_id')::uuid
      AND admins.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = (auth.jwt() -> 'user_metadata' ->> 'admin_id')::uuid
      AND admins.is_active = true
    )
  );

-- 관리자는 카테고리 삭제 가능
CREATE POLICY "Admins can delete categories" ON categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = (auth.jwt() -> 'user_metadata' ->> 'admin_id')::uuid
      AND admins.is_active = true
    )
  );

-- ===== 20260105040541 create_site_settings_table =====
-- 사이트 설정 테이블 (key-value 형태로 유연하게 설정 저장)
CREATE TABLE site_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES admins(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE site_settings IS '사이트 설정';

-- 기본 설정값 삽입
INSERT INTO site_settings (key, value, description) VALUES
  ('default_commission_rate', '10', '기본 수수료율 (%)'),
  ('commission_rate_min', '5', '최소 수수료율 (%)'),
  ('commission_rate_max', '15', '최대 수수료율 (%)'),
  ('settlement_cycle', '"monthly"', '정산 주기 (weekly/monthly)'),
  ('reservation_advance_days', '30', '예약 가능 기간 (일)'),
  ('cancellation_policy', '{"d3": 100, "d2": 70, "d1": 50, "d0": 0}', '취소 정책 (D-n: 환불율%)'),
  ('min_reservation_notice', '1', '최소 예약 사전 알림 (일)'),
  ('service_email', '"contact@damda.co.kr"', '서비스 이메일'),
  ('service_phone', '"02-1234-5678"', '서비스 전화번호'),
  ('business_hours', '{"start": "09:00", "end": "18:00"}', '운영 시간');

-- RLS 활성화
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 관리자만 읽기/쓰기 가능
CREATE POLICY "Admins can read site_settings" ON site_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update site_settings" ON site_settings
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can insert site_settings" ON site_settings
  FOR INSERT TO authenticated WITH CHECK (true);

-- ===== 20260109131107 create_partner_inquiries =====
-- partner_inquiries 테이블 생성 (입점 문의)
CREATE TABLE partner_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 업체 기본 정보 (business_owners와 동일)
  name VARCHAR(255) NOT NULL,                    -- 업체명
  business_number VARCHAR(20) NOT NULL,          -- 사업자등록번호
  representative VARCHAR(100) NOT NULL,          -- 대표자명
  
  -- 담당자 정보
  contact_name VARCHAR(100) NOT NULL,            -- 담당자명
  contact_phone VARCHAR(20) NOT NULL,            -- 담당자 연락처
  email VARCHAR(255) NOT NULL,                   -- 이메일
  
  -- 주소 정보
  zipcode VARCHAR(10),                           -- 우편번호
  address VARCHAR(500),                          -- 주소
  address_detail VARCHAR(255),                   -- 상세주소
  
  -- 프로그램/업체 소개
  program_types TEXT,                            -- 프로그램 유형
  description TEXT,                              -- 업체/프로그램 소개
  
  -- 상태 관리
  status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  rejection_reason TEXT,                         -- 반려 사유
  reviewed_by UUID REFERENCES admins(id),        -- 검토한 관리자
  reviewed_at TIMESTAMPTZ,                       -- 검토일시
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 생성
CREATE INDEX idx_partner_inquiries_status ON partner_inquiries(status);
CREATE INDEX idx_partner_inquiries_created_at ON partner_inquiries(created_at DESC);

-- 코멘트
COMMENT ON TABLE partner_inquiries IS '입점 문의 - 파트너(사업주) 입점 신청';

-- RLS 활성화
ALTER TABLE partner_inquiries ENABLE ROW LEVEL SECURITY;

-- 누구나 입점 문의 등록 가능
CREATE POLICY "Anyone can insert partner inquiries"
  ON partner_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 본인 문의 조회 가능 (이메일 기반)
CREATE POLICY "Users can view own inquiries"
  ON partner_inquiries
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ===== 20260117111239 add_public_read_policies =====
-- Allow public read access to categories (products catalog browsing)
CREATE POLICY "Allow public read access to categories" ON categories
FOR SELECT USING (is_active = true);

-- Allow public read access to products (catalog browsing)
CREATE POLICY "Allow public read access to products" ON products
FOR SELECT USING (is_visible = true);

-- Allow public read access to business_owners (for product details)
CREATE POLICY "Allow public read access to business_owners" ON business_owners
FOR SELECT USING (status = 'active');

-- Allow public read access to product_options
CREATE POLICY "Allow public read access to product_options" ON product_options
FOR SELECT USING (true);

-- Allow public read access to product_images
CREATE POLICY "Allow public read access to product_images" ON product_images
FOR SELECT USING (true);

-- Allow public read access to reviews (for product reviews display)
CREATE POLICY "Allow public read access to visible reviews" ON reviews
FOR SELECT USING (is_visible = true);

-- Allow public read access to review_images
CREATE POLICY "Allow public read access to review_images" ON review_images
FOR SELECT USING (true);

-- Allow public read access to banners
CREATE POLICY "Allow public read access to visible banners" ON banners
FOR SELECT USING (is_visible = true);

-- Allow public read access to notices
CREATE POLICY "Allow public read access to visible notices" ON notices
FOR SELECT USING (is_visible = true);

-- Allow public read access to FAQs
CREATE POLICY "Allow public read access to visible faqs" ON faqs
FOR SELECT USING (is_visible = true);

-- Allow public read access to popups
CREATE POLICY "Allow public read access to visible popups" ON popups
FOR SELECT USING (is_visible = true);

-- Allow public read access to site_settings
CREATE POLICY "Allow public read access to site_settings" ON site_settings
FOR SELECT USING (true);

-- ===== 20260117111326 add_user_rls_policies =====
-- Wishlist policies (users can only access their own wishlists)
CREATE POLICY "Users can view own wishlists" ON wishlists
FOR SELECT USING (auth.uid() = daycare_id);

CREATE POLICY "Users can insert own wishlists" ON wishlists
FOR INSERT WITH CHECK (auth.uid() = daycare_id);

CREATE POLICY "Users can delete own wishlists" ON wishlists
FOR DELETE USING (auth.uid() = daycare_id);

-- Cart policies (users can only access their own carts)
CREATE POLICY "Users can view own carts" ON carts
FOR SELECT USING (auth.uid() = daycare_id);

CREATE POLICY "Users can insert own carts" ON carts
FOR INSERT WITH CHECK (auth.uid() = daycare_id);

CREATE POLICY "Users can update own carts" ON carts
FOR UPDATE USING (auth.uid() = daycare_id);

CREATE POLICY "Users can delete own carts" ON carts
FOR DELETE USING (auth.uid() = daycare_id);

-- Reservations policies (users can only view their own reservations)
CREATE POLICY "Users can view own reservations" ON reservations
FOR SELECT USING (auth.uid() = daycare_id);

-- Inquiries policies (users can only access their own inquiries)
CREATE POLICY "Users can view own inquiries" ON inquiries
FOR SELECT USING (auth.uid() = daycare_id);

CREATE POLICY "Users can insert own inquiries" ON inquiries
FOR INSERT WITH CHECK (auth.uid() = daycare_id);

-- Daycares policies (users can view and update their own profile)
CREATE POLICY "Users can view own daycare profile" ON daycares
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own daycare profile" ON daycares
FOR UPDATE USING (auth.uid() = id);

-- Reviews policies (users can manage their own reviews)
CREATE POLICY "Users can insert own reviews" ON reviews
FOR INSERT WITH CHECK (auth.uid() = daycare_id);

CREATE POLICY "Users can update own reviews" ON reviews
FOR UPDATE USING (auth.uid() = daycare_id);

CREATE POLICY "Users can delete own reviews" ON reviews
FOR DELETE USING (auth.uid() = daycare_id);

-- ===== 20260117111508 fix_business_owners_public_read =====
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Allow public read access to business_owners" ON business_owners;

-- Create a more permissive policy for public reads (product listing needs to show business owner info)
CREATE POLICY "Allow public read access to business_owners" ON business_owners
FOR SELECT USING (true);

-- Also add anon access policy for product_unavailable_dates (needed for product detail page)
CREATE POLICY "Allow public read access to product_unavailable_dates" ON product_unavailable_dates
FOR SELECT USING (true);

-- ===== 20260118005033 add_icon_url_to_categories =====
ALTER TABLE categories ADD COLUMN icon_url TEXT;

-- ===== 20260118025632 allow_null_reservation_id_in_reviews =====
-- reservation_id를 nullable로 변경 (리뷰가 예약 없이도 등록 가능하도록)
ALTER TABLE reviews ALTER COLUMN reservation_id DROP NOT NULL;

-- ===== 20260126105235 create_recent_views_table =====
-- 최근 본 상품 테이블
CREATE TABLE recent_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(daycare_id, product_id)
);

-- 인덱스
CREATE INDEX idx_recent_views_daycare_id ON recent_views(daycare_id);
CREATE INDEX idx_recent_views_viewed_at ON recent_views(viewed_at DESC);

-- RLS 활성화
ALTER TABLE recent_views ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인만 조회/수정 가능
CREATE POLICY "Users can view own recent views" ON recent_views
  FOR SELECT USING (daycare_id = auth.uid());

CREATE POLICY "Users can insert own recent views" ON recent_views
  FOR INSERT WITH CHECK (daycare_id = auth.uid());

CREATE POLICY "Users can update own recent views" ON recent_views
  FOR UPDATE USING (daycare_id = auth.uid());

CREATE POLICY "Users can delete own recent views" ON recent_views
  FOR DELETE USING (daycare_id = auth.uid());

-- 테이블 코멘트
COMMENT ON TABLE recent_views IS '최근 본 상품';

-- ===== 20260130023901 add_admin_product_policies =====
-- 어드민이 상품을 관리할 수 있도록 RLS 정책 추가

-- products 테이블: 어드민 INSERT
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
);

-- products 테이블: 어드민 UPDATE
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
);

-- products 테이블: 어드민 DELETE
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
);

-- products 테이블: 어드민 SELECT (전체 조회)
CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
);

-- product_options 테이블: 어드민 ALL
CREATE POLICY "Admins can manage product options"
ON public.product_options
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
);

-- product_images 테이블: 어드민 ALL
CREATE POLICY "Admins can manage product images"
ON public.product_images
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
);

-- ===== 20260130024201 add_business_owners_id_default =====
-- business_owners 테이블 id에 기본값 추가 (자동 생성)
ALTER TABLE public.business_owners 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ===== 20260130025509 create_regions_table =====
-- 지역 테이블 (검색 UI용)
CREATE TABLE regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES regions(id) ON DELETE CASCADE,
  name varchar(50) NOT NULL,
  full_name varchar(100) NOT NULL,
  depth integer NOT NULL CHECK (depth >= 1 AND depth <= 2),
  sort_order integer NOT NULL DEFAULT 0,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE regions IS '지역 (검색 UI용)';
COMMENT ON COLUMN regions.parent_id IS '상위 지역 (시/도는 null)';
COMMENT ON COLUMN regions.name IS '지역명 (서울, 강남구)';
COMMENT ON COLUMN regions.full_name IS '전체 지역명 (서울 강남구)';
COMMENT ON COLUMN regions.depth IS '1: 시/도, 2: 구/군';
COMMENT ON COLUMN regions.is_popular IS '인기 지역 여부';

-- 인덱스
CREATE INDEX idx_regions_parent_id ON regions(parent_id);
CREATE INDEX idx_regions_depth ON regions(depth);
CREATE INDEX idx_regions_is_active ON regions(is_active);
CREATE INDEX idx_regions_is_popular ON regions(is_popular);

-- RLS 활성화
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 허용
CREATE POLICY "regions_select_policy" ON regions
  FOR SELECT USING (true);

-- ===== 20260130030655 add_products_address_detail =====
-- products 테이블에 상세주소 컬럼 추가
ALTER TABLE public.products 
ADD COLUMN address_detail character varying(500) NULL;

-- ===== 20260130042935 allow_signup_insert_daycares =====
-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "Daycares can insert own profile" ON daycares;

-- 새 정책: 인증된 사용자는 자신의 ID로 insert 가능 (이메일 확인 전에도)
CREATE POLICY "Daycares can insert own profile" ON daycares
FOR INSERT 
TO authenticated
WITH CHECK (id = auth.uid());

-- anon 사용자도 insert 허용 (signUp 직후 세션이 없을 경우 대비)
CREATE POLICY "Allow signup insert" ON daycares
FOR INSERT
TO anon
WITH CHECK (true);

-- ===== 20260130042956 allow_anon_upload_licenses =====
-- anon 사용자도 public 버킷의 licenses 폴더에 업로드 허용
CREATE POLICY "Allow signup license upload" ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'public' AND (storage.foldername(name))[1] = 'licenses');

-- ===== 20260130072709 create_ad_banners_table =====
-- 광고 배너 테이블 생성
CREATE TABLE ad_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  advertiser_name VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_ad_banners_is_visible ON ad_banners(is_visible);
CREATE INDEX idx_ad_banners_sort_order ON ad_banners(sort_order);
CREATE INDEX idx_ad_banners_dates ON ad_banners(start_date, end_date);

-- RLS 활성화
ALTER TABLE ad_banners ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 공개된 광고 배너 조회 가능
CREATE POLICY "Anyone can view visible ad banners" ON ad_banners
  FOR SELECT USING (is_visible = true);

-- 정책: 인증된 사용자(관리자)가 모든 작업 가능
CREATE POLICY "Authenticated users can manage ad banners" ON ad_banners
  FOR ALL USING (auth.role() = 'authenticated');

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_ad_banners_updated_at
  BEFORE UPDATE ON ad_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE ad_banners IS '메인 카테고리 하단 광고 배너 (외부 업체 광고)';
COMMENT ON COLUMN ad_banners.title IS '광고 제목';
COMMENT ON COLUMN ad_banners.advertiser_name IS '광고주명 (예: 도시락업체)';
COMMENT ON COLUMN ad_banners.image_url IS '배너 이미지 URL';
COMMENT ON COLUMN ad_banners.link_url IS '외부 링크 URL (outlink)';
COMMENT ON COLUMN ad_banners.sort_order IS '정렬 순서 (낮을수록 먼저 표시)';
COMMENT ON COLUMN ad_banners.start_date IS '게시 시작일';
COMMENT ON COLUMN ad_banners.end_date IS '게시 종료일';
COMMENT ON COLUMN ad_banners.is_visible IS '공개 여부';

-- ===== 20260130092738 add_revision_required_status =====
-- daycares 테이블에 보완필요 관련 필드 추가
ALTER TABLE daycares 
ADD COLUMN IF NOT EXISTS revision_reason TEXT,
ADD COLUMN IF NOT EXISTS revision_response TEXT,
ADD COLUMN IF NOT EXISTS revision_file TEXT,
ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS revision_submitted_at TIMESTAMPTZ;

-- 기존 status 컬럼의 check constraint 확인 및 업데이트
-- (status가 text 타입이므로 enum이 아닌 경우 constraint만 추가)
COMMENT ON COLUMN daycares.status IS 'pending: 가입대기, requested: 승인요청, approved: 승인완료, rejected: 승인거절, revision_required: 보완필요';
COMMENT ON COLUMN daycares.revision_reason IS '보완필요 사유 (관리자 입력)';
COMMENT ON COLUMN daycares.revision_response IS '보완 응답 (사용자 입력)';
COMMENT ON COLUMN daycares.revision_file IS '보완 첨부파일 URL';
COMMENT ON COLUMN daycares.revision_requested_at IS '보완 요청 일시';
COMMENT ON COLUMN daycares.revision_submitted_at IS '보완 제출 일시';

-- ===== 20260130092844 create_legal_documents_table =====
-- 법적 문서 (이용약관, 개인정보처리방침, 환불정책, 예약안내) 테이블
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL CHECK (category IN ('terms', 'privacy', 'refund-policy', 'reservation-guide')),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 카테고리별 최신 문서 조회를 위한 인덱스
CREATE INDEX idx_legal_documents_category ON legal_documents(category, created_at DESC);

-- 공개 문서 조회를 위한 인덱스
CREATE INDEX idx_legal_documents_visible ON legal_documents(category, is_visible);

-- 테이블 코멘트
COMMENT ON TABLE legal_documents IS '법적 문서 (이용약관, 개인정보처리방침, 환불정책, 예약안내)';
COMMENT ON COLUMN legal_documents.category IS '문서 카테고리: terms(이용약관), privacy(개인정보처리방침), refund-policy(환불정책), reservation-guide(예약안내)';
COMMENT ON COLUMN legal_documents.version IS '버전 번호 (카테고리별로 자동 증가)';
COMMENT ON COLUMN legal_documents.is_visible IS '공개 여부 (기본값: 공개)';

-- ===== 20260130094153 auto_confirm_email =====
-- 회원가입 시 자동으로 이메일 인증 처리하는 트리거
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 사용자의 email_confirmed_at을 현재 시간으로 설정
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있으면 삭제
DROP TRIGGER IF EXISTS on_auth_user_created_confirm_email ON auth.users;

-- auth.users 테이블에 트리거 생성
CREATE TRIGGER on_auth_user_created_confirm_email
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email();

-- ===== 20260130100211 update_daycares_status_check_constraint =====
-- 기존 체크 제약조건 삭제
ALTER TABLE daycares DROP CONSTRAINT IF EXISTS daycares_status_check;

-- 새 체크 제약조건 추가 (revision_required 포함)
ALTER TABLE daycares ADD CONSTRAINT daycares_status_check 
CHECK (status IN ('pending', 'requested', 'approved', 'rejected', 'revision_required'));

-- ===== 20260130102831 add_admin_policy_for_product_unavailable_dates =====
-- Admin이 product_unavailable_dates 테이블을 관리할 수 있도록 RLS 정책 추가
CREATE POLICY "Admins can manage product unavailable dates"
ON public.product_unavailable_dates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
);

-- ===== 20260130113231 add_category_banner_url =====
-- 카테고리 배너 이미지 URL 컬럼 추가
ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- ===== 20260130115844 add_admin_update_policy_for_reviews =====
-- Admin이 모든 리뷰를 수정할 수 있는 정책 추가
CREATE POLICY "Admins can update all reviews"
ON public.reviews
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);

-- Admin이 모든 리뷰를 조회할 수 있는 정책 추가
CREATE POLICY "Admins can view all reviews"
ON public.reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);

-- Admin이 리뷰를 삭제할 수 있는 정책 추가
CREATE POLICY "Admins can delete all reviews"
ON public.reviews
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);

-- ===== 20260204073709 create_document_tables =====
-- 사업주 문서 테이블
CREATE TABLE IF NOT EXISTS business_owner_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  document_type varchar NOT NULL CHECK (document_type IN ('business_registration', 'bank_account', 'business_license', 'other')),
  file_name varchar NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type varchar,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 사업주 문서 테이블 코멘트
COMMENT ON TABLE business_owner_documents IS '사업주 문서 (사업자등록증, 통장사본, 영업신고증 등)';
COMMENT ON COLUMN business_owner_documents.document_type IS 'business_registration: 사업자등록증, bank_account: 통장사본, business_license: 영업신고증, other: 기타';

-- 어린이집 문서 테이블
CREATE TABLE IF NOT EXISTS daycare_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  document_type varchar NOT NULL CHECK (document_type IN ('license', 'other')),
  file_name varchar NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type varchar,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 어린이집 문서 테이블 코멘트
COMMENT ON TABLE daycare_documents IS '어린이집 문서 (인가증 등)';
COMMENT ON COLUMN daycare_documents.document_type IS 'license: 인가증, other: 기타';

-- RLS 활성화
ALTER TABLE business_owner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE daycare_documents ENABLE ROW LEVEL SECURITY;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_business_owner_documents_owner_id ON business_owner_documents(business_owner_id);
CREATE INDEX IF NOT EXISTS idx_daycare_documents_daycare_id ON daycare_documents(daycare_id);

-- ===== 20260204074548 add_document_tables_rls_policies =====
-- business_owner_documents RLS 정책
CREATE POLICY "Allow all for authenticated users on business_owner_documents"
ON business_owner_documents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- daycare_documents RLS 정책
-- 어린이집 본인 문서 조회/생성/삭제
CREATE POLICY "Daycares can manage own documents"
ON daycare_documents
FOR ALL
TO authenticated
USING (daycare_id = auth.uid())
WITH CHECK (daycare_id = auth.uid());

-- 관리자는 모든 문서 관리 가능 (user_metadata에 role이 있는 경우)
CREATE POLICY "Admins can manage all daycare documents"
ON daycare_documents
FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
);

-- ===== 20260204080529 add_settlements_admin_policies =====
-- Add INSERT policy for admins
CREATE POLICY "Admins can insert settlements" ON settlements
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);

-- Add UPDATE policy for admins
CREATE POLICY "Admins can update settlements" ON settlements
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);

-- Add DELETE policy for admins
CREATE POLICY "Admins can delete settlements" ON settlements
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);

-- ===== 20260204094736 create_reservation_holds_table =====
-- 결제 홀드 테이블 생성 - 동시 결제 방지를 위한 10분간 예약 잠금
CREATE TABLE IF NOT EXISTS reservation_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reserved_date DATE NOT NULL,
  daycare_id UUID NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),

  -- 동시 결제 방지: 같은 상품 + 같은 날짜에 하나의 홀드만 가능
  CONSTRAINT unique_product_date_hold UNIQUE (product_id, reserved_date)
);

-- 인덱스 생성
CREATE INDEX idx_reservation_holds_expires_at ON reservation_holds(expires_at);
CREATE INDEX idx_reservation_holds_daycare_id ON reservation_holds(daycare_id);

-- RLS 활성화
ALTER TABLE reservation_holds ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Users can view own holds" ON reservation_holds FOR SELECT USING (auth.uid() = daycare_id);
CREATE POLICY "Users can create holds" ON reservation_holds FOR INSERT WITH CHECK (auth.uid() = daycare_id);
CREATE POLICY "Users can delete own holds" ON reservation_holds FOR DELETE USING (auth.uid() = daycare_id);

-- 만료된 홀드 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_holds() RETURNS void AS $$
BEGIN 
  DELETE FROM reservation_holds WHERE expires_at < now(); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 테이블 코멘트
COMMENT ON TABLE reservation_holds IS '결제 홀드 - 동시 결제 방지를 위한 10분간 예약 잠금';

-- ===== 20260204095903 add_user_role_on_daycare_approval =====
-- 어린이집 승인 시 자동으로 user_roles에 daycare 역할 추가하는 트리거
CREATE OR REPLACE FUNCTION add_daycare_role_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- status가 approved로 변경되었을 때만 실행
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- auth.users에 존재하는 경우에만 user_roles에 추가
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
      INSERT INTO user_roles (id, role)
      VALUES (NEW.id, 'daycare')
      ON CONFLICT (id) DO UPDATE SET role = 'daycare';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있으면 삭제
DROP TRIGGER IF EXISTS on_daycare_approval ON daycares;

-- 트리거 생성 (INSERT와 UPDATE 모두에 대응)
CREATE TRIGGER on_daycare_approval
  AFTER INSERT OR UPDATE OF status ON daycares
  FOR EACH ROW
  EXECUTE FUNCTION add_daycare_role_on_approval();

COMMENT ON FUNCTION add_daycare_role_on_approval() IS '어린이집 승인 시 user_roles에 daycare 역할 자동 추가';

-- ===== 20260204100547 add_check_availability_functions =====
-- 특정 상품의 예약 불가능한 날짜 목록 조회 (SECURITY DEFINER로 RLS 우회)
CREATE OR REPLACE FUNCTION get_unavailable_dates(p_product_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  result TEXT[];
BEGIN
  -- 만료된 홀드 정리
  DELETE FROM reservation_holds WHERE expires_at < now();
  
  -- 예약이 있는 날짜 + 홀드가 있는 날짜 조회
  SELECT ARRAY_AGG(DISTINCT reserved_date::TEXT)
  INTO result
  FROM (
    -- 예약이 있는 날짜
    SELECT reserved_date
    FROM reservations
    WHERE product_id = p_product_id
      AND status IN ('pending', 'paid', 'confirmed')
    
    UNION
    
    -- 홀드가 있는 날짜 (현재 사용자 제외)
    SELECT reserved_date
    FROM reservation_holds
    WHERE product_id = p_product_id
      AND expires_at > now()
      AND daycare_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
  ) AS unavailable;
  
  RETURN COALESCE(result, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 특정 상품+날짜의 예약 가능 여부 확인
CREATE OR REPLACE FUNCTION check_reservation_available(
  p_product_id UUID,
  p_reserved_date DATE
)
RETURNS JSON AS $$
DECLARE
  v_has_reservation BOOLEAN;
  v_has_hold BOOLEAN;
  v_hold_by_self BOOLEAN;
BEGIN
  -- 만료된 홀드 정리
  DELETE FROM reservation_holds WHERE expires_at < now();
  
  -- 1. 예약이 있는지 확인
  SELECT EXISTS (
    SELECT 1 FROM reservations
    WHERE product_id = p_product_id
      AND reserved_date = p_reserved_date
      AND status IN ('pending', 'paid', 'confirmed')
  ) INTO v_has_reservation;
  
  IF v_has_reservation THEN
    RETURN json_build_object(
      'available', false,
      'reason', 'already_reserved',
      'message', '해당 날짜에 이미 예약이 있습니다.'
    );
  END IF;
  
  -- 2. 다른 사용자의 홀드가 있는지 확인
  SELECT 
    EXISTS (
      SELECT 1 FROM reservation_holds
      WHERE product_id = p_product_id
        AND reserved_date = p_reserved_date
        AND expires_at > now()
    ),
    EXISTS (
      SELECT 1 FROM reservation_holds
      WHERE product_id = p_product_id
        AND reserved_date = p_reserved_date
        AND expires_at > now()
        AND daycare_id = auth.uid()
    )
  INTO v_has_hold, v_hold_by_self;
  
  IF v_has_hold AND NOT v_hold_by_self THEN
    RETURN json_build_object(
      'available', false,
      'reason', 'hold_by_other',
      'message', '다른 사용자가 결제를 진행 중입니다.'
    );
  END IF;
  
  RETURN json_build_object(
    'available', true,
    'reason', null,
    'message', null
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_unavailable_dates(UUID) IS '특정 상품의 예약 불가능한 날짜 목록 조회';
COMMENT ON FUNCTION check_reservation_available(UUID, DATE) IS '특정 상품+날짜의 예약 가능 여부 확인';

-- ===== 20260205063249 create_notification_logs_and_extensions =====
-- 알림톡 발송 로그 테이블
CREATE TABLE notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type varchar NOT NULL,
  template_code varchar NOT NULL,
  recipient_type varchar NOT NULL CHECK (recipient_type IN ('daycare', 'business_owner')),
  recipient_id uuid,
  recipient_phone varchar NOT NULL,
  message_content text,
  variables jsonb,
  status varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  aligo_response jsonb,
  reference_type varchar,
  reference_id uuid,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

COMMENT ON TABLE notification_logs IS '알림톡 발송 로그';
COMMENT ON COLUMN notification_logs.notification_type IS '알림 유형 (reservation_completed, new_reservation, etc.)';
COMMENT ON COLUMN notification_logs.template_code IS '알리고 템플릿 코드 (UF_xxxx)';
COMMENT ON COLUMN notification_logs.recipient_type IS '수신자 유형 (daycare, business_owner)';
COMMENT ON COLUMN notification_logs.reference_type IS '참조 테이블 (reservation, daycare)';
COMMENT ON COLUMN notification_logs.reference_id IS '참조 레코드 ID';

CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX idx_notification_logs_reference ON notification_logs(reference_type, reference_id);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at DESC);

-- pg_net: 트리거에서 Edge Function HTTP 호출용
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- pg_cron: 스케줄 알림 (D-1 리마인더, 리뷰 요청)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ===== 20260205070051 enable_http_extension =====
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- ===== 20260205070529 create_send_alimtalk_http_function =====
-- DB에서 직접 Aligo API 호출하는 함수 (고정 IP로 나감)
CREATE OR REPLACE FUNCTION send_alimtalk_http(p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _response extensions.http_response;
BEGIN
  SELECT * INTO _response FROM extensions.http((
    'POST',
    'https://kakaoapi.aligo.in/akv10/alimtalk/send/',
    ARRAY[extensions.http_header('Content-Type', 'application/x-www-form-urlencoded')]::extensions.http_header[],
    'application/x-www-form-urlencoded',
    p_body
  )::extensions.http_request);

  RETURN jsonb_build_object(
    'status', _response.status,
    'body', _response.content::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 0,
    'body', jsonb_build_object('code', -1, 'message', SQLERRM)
  );
END;
$$;

-- ===== 20260208070854 add_memo_to_partner_inquiries =====
ALTER TABLE partner_inquiries ADD COLUMN IF NOT EXISTS memo text;

-- ===== 20260208071348 add_update_policy_partner_inquiries =====
CREATE POLICY "Allow update partner inquiries" ON partner_inquiries FOR UPDATE USING (true) WITH CHECK (true);

-- ===== 20260208080053 add_admin_insert_policy_daycares =====
CREATE POLICY "Admins can insert daycares" ON daycares FOR INSERT WITH CHECK (true);

-- ===== 20260211053640 add_reserver_info_to_reservations =====
ALTER TABLE reservations
  ADD COLUMN reserver_name text,
  ADD COLUMN reserver_phone text,
  ADD COLUMN reserver_email text;

COMMENT ON COLUMN reservations.reserver_name IS '예약시 입력한 예약자명';
COMMENT ON COLUMN reservations.reserver_phone IS '예약시 입력한 연락처';
COMMENT ON COLUMN reservations.reserver_email IS '예약시 입력한 이메일';

-- ===== 20260211085723 auto_complete_reservations =====
-- 이용일이 지난 confirmed 예약을 자동으로 completed로 변경하는 함수
CREATE OR REPLACE FUNCTION auto_complete_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE reservations
  SET status = 'completed',
      updated_at = now()
  WHERE status = 'confirmed'
    AND reserved_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 매일 자정(KST) 05분에 실행 (UTC 15:05)
SELECT cron.schedule(
  'auto-complete-reservations',
  '5 15 * * *',
  $$SELECT auto_complete_reservations()$$
);

-- ===== 20260211091844 add_partner_inquiries_delete_policy =====
CREATE POLICY "Allow delete partner inquiries" ON public.partner_inquiries FOR DELETE USING (true);

-- ===== 20260211110231 fix_reservation_alimtalk_trigger_for_confirmed =====
CREATE OR REPLACE FUNCTION notify_reservation_event()
RETURNS trigger AS $$
BEGIN
  -- 예약 결제 완료 (paid 또는 confirmed로 생성/변경 시)
  IF (TG_OP = 'INSERT' AND NEW.status IN ('paid', 'confirmed'))
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'paid' AND NEW.status = 'paid')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'confirmed' AND NEW.status = 'confirmed' AND OLD.status NOT IN ('paid')) THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'reservation_paid', 'reservation_id', NEW.id)
    );
  END IF;

  -- 예약 취소
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled' THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'reservation_cancelled', 'reservation_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== 20260211150027 add_settlement_month_column =====
-- settlement_month 컬럼 추가 (YYYY-MM 형식)
ALTER TABLE settlements ADD COLUMN settlement_month VARCHAR(7);

-- 기존 데이터 마이그레이션: settlement_period_end 기준으로 월 추출
UPDATE settlements SET settlement_month = TO_CHAR(settlement_period_end::date, 'YYYY-MM');

-- 인덱스 추가 (월별 조회 성능 향상)
CREATE INDEX idx_settlements_settlement_month ON settlements(settlement_month);

-- ===== 20260224065624 add_refunded_status_to_alimtalk_trigger =====
CREATE OR REPLACE FUNCTION notify_reservation_event()
RETURNS TRIGGER AS $$
BEGIN
  -- 예약 결제 완료 (paid 또는 confirmed로 생성/변경 시)
  IF (TG_OP = 'INSERT' AND NEW.status IN ('paid', 'confirmed'))
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'paid' AND NEW.status = 'paid')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'confirmed' AND NEW.status = 'confirmed' AND OLD.status NOT IN ('paid')) THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'reservation_paid', 'reservation_id', NEW.id)
    );
  END IF;

  -- 예약 취소 (cancelled 또는 refunded)
  IF TG_OP = 'UPDATE'
     AND OLD.status NOT IN ('cancelled', 'refunded')
     AND NEW.status IN ('cancelled', 'refunded') THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'reservation_cancelled', 'reservation_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== 20260224082403 change_daycare_alimtalk_to_revision_required =====
CREATE OR REPLACE FUNCTION notify_daycare_event()
RETURNS TRIGGER AS $$
BEGIN
  -- 가입 승인
  IF OLD.status IS DISTINCT FROM 'approved' AND NEW.status = 'approved' THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'daycare_approved', 'daycare_id', NEW.id)
    );
  END IF;

  -- 보완필요
  IF OLD.status IS DISTINCT FROM 'revision_required' AND NEW.status = 'revision_required' THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'daycare_rejected', 'daycare_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== 20260302050733 create_product_preview_tokens =====
CREATE TABLE product_preview_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_owner_id UUID NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_preview_token UNIQUE (token)
);

CREATE INDEX idx_preview_tokens_lookup ON product_preview_tokens(token, expires_at);
ALTER TABLE product_preview_tokens ENABLE ROW LEVEL SECURITY;

-- 사업주는 자기 상품에 대한 토큰만 생성 가능
CREATE POLICY "bo_insert_own" ON product_preview_tokens FOR INSERT
  WITH CHECK (business_owner_id = auth.uid() AND EXISTS (
    SELECT 1 FROM products WHERE id = product_id AND business_owner_id = auth.uid()
  ));

-- 토큰 검증용: 만료되지 않은 토큰은 누구나 조회 가능
CREATE POLICY "anyone_select_valid" ON product_preview_tokens FOR SELECT
  USING (expires_at > now());

-- ===== 20260305083118 add_tax_email_to_business_owners =====
ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS tax_email text;

-- ===== 20260606004454 add_missing_fk_covering_indexes =====
-- FK 컬럼에 커버링 인덱스 추가 (Supabase performance advisor: unindexed_foreign_keys 15건)
-- 모든 대상 테이블이 소규모라 즉시 생성되며 락 영향 없음. IF NOT EXISTS로 재실행 안전.
CREATE INDEX IF NOT EXISTS idx_carts_product_id ON public.carts(product_id);
CREATE INDEX IF NOT EXISTS idx_commission_histories_changed_by ON public.commission_histories(changed_by);
CREATE INDEX IF NOT EXISTS idx_daycare_memos_admin_id ON public.daycare_memos(admin_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_answered_by ON public.inquiries(answered_by);
CREATE INDEX IF NOT EXISTS idx_legal_documents_created_by ON public.legal_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_notices_created_by ON public.notices(created_by);
CREATE INDEX IF NOT EXISTS idx_partner_inquiries_reviewed_by ON public.partner_inquiries(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_product_preview_tokens_business_owner_id ON public.product_preview_tokens(business_owner_id);
CREATE INDEX IF NOT EXISTS idx_product_preview_tokens_product_id ON public.product_preview_tokens(product_id);
CREATE INDEX IF NOT EXISTS idx_recent_views_product_id ON public.recent_views(product_id);
CREATE INDEX IF NOT EXISTS idx_refunds_processed_by ON public.refunds(processed_by);
CREATE INDEX IF NOT EXISTS idx_reservation_options_product_option_id ON public.reservation_options(product_option_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reservation_id ON public.reviews(reservation_id);
CREATE INDEX IF NOT EXISTS idx_site_settings_updated_by ON public.site_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON public.wishlists(product_id);
