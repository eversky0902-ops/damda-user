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
