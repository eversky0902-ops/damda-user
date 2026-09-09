-- =====================================================================
-- 2차개발 [1/2 스키마] 사업장(businesses) 계층 도입 + 상품 판매방식(sale_type)
-- =====================================================================

CREATE TYPE product_sale_type AS ENUM ('daily_one', 'time_slot', 'quantity');
CREATE TYPE product_unavailable_kind AS ENUM ('closed', 'capacity');
CREATE TYPE change_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id UUID NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  address VARCHAR,
  address_detail VARCHAR,
  zipcode VARCHAR,
  latitude NUMERIC,
  longitude NUMERIC,
  region VARCHAR,
  thumbnail TEXT,
  intro TEXT,
  contact_phone VARCHAR,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_businesses_owner ON businesses(business_owner_id);
CREATE INDEX idx_businesses_visible ON businesses(is_visible);
COMMENT ON TABLE businesses IS '사업장 (사업자→사업장→상품 구조의 중간 계층). 주소/위치/노출 보유';

CREATE TABLE business_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  holiday_date DATE,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  reason VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_holidays_date_or_dow CHECK (holiday_date IS NOT NULL OR day_of_week IS NOT NULL)
);
CREATE INDEX idx_business_holidays_business ON business_holidays(business_id);
COMMENT ON TABLE business_holidays IS '사업장 휴무일 (장소 전체 휴무 → 상품상세에 "휴무" 표시)';

CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES business_owners(id) ON DELETE SET NULL,
  changes JSONB NOT NULL,
  status change_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_change_requests_business ON change_requests(business_id, status);
COMMENT ON TABLE change_requests IS '사업장 정보 수정 요청 → 어드민 D+1 승인 큐';

CREATE TABLE product_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  slot_time TIME,
  capacity INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_schedules_product ON product_schedules(product_id, day_of_week);
COMMENT ON TABLE product_schedules IS '상품 요일별 운영/슬롯/정원 (available_time_slots jsonb 정규화)';

ALTER TABLE products
  ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  ADD COLUMN sale_type product_sale_type NOT NULL DEFAULT 'time_slot';
CREATE INDEX idx_products_business ON products(business_id);

ALTER TABLE product_unavailable_dates
  ADD COLUMN kind product_unavailable_kind NOT NULL DEFAULT 'closed',
  ADD COLUMN slot_time TIME,
  ADD COLUMN capacity_override INT;

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read for admin app" ON businesses FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access to businesses" ON businesses FOR SELECT USING (is_visible = true);
CREATE POLICY "Business owners can view own businesses" ON businesses FOR SELECT
  USING (business_owner_id = auth.uid());
CREATE POLICY "Admins can manage businesses" ON businesses FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true));

CREATE POLICY "Allow public read access to business_holidays" ON business_holidays FOR SELECT USING (true);
CREATE POLICY "Business owners can manage own business holidays" ON business_holidays FOR ALL
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_holidays.business_id AND b.business_owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_holidays.business_id AND b.business_owner_id = auth.uid()));
CREATE POLICY "Admins can manage business holidays" ON business_holidays FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true));

CREATE POLICY "Business owners can insert own change requests" ON change_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM businesses b WHERE b.id = change_requests.business_id AND b.business_owner_id = auth.uid()));
CREATE POLICY "Business owners can view own change requests" ON change_requests FOR SELECT
  USING (requested_by = auth.uid());
CREATE POLICY "Admins can manage change requests" ON change_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true));

CREATE POLICY "Allow anon read for admin app" ON product_schedules FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access to product_schedules" ON product_schedules FOR SELECT USING (true);
CREATE POLICY "Business owners can manage own product schedules" ON product_schedules FOR ALL
  USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_schedules.product_id AND products.business_owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM products WHERE products.id = product_schedules.product_id AND products.business_owner_id = auth.uid()));
CREATE POLICY "Admins can manage product schedules" ON product_schedules FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true));
