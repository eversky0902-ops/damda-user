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
