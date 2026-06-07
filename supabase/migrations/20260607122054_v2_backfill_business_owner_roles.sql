-- 사업주에게 business_owner 역할 백필 (2차 "사장님 직접 상품 등록/수정" RLS 전제)
-- 기존엔 user_roles에 daycare만 있어 사업주는 is_business_owner()=false → 상품 INSERT 불가했음.
INSERT INTO user_roles (id, role)
SELECT id, 'business_owner' FROM business_owners
ON CONFLICT (id) DO NOTHING;
