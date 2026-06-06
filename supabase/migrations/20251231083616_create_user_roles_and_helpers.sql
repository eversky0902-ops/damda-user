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
