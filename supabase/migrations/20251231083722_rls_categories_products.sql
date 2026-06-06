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
