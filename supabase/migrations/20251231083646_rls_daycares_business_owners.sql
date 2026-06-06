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
