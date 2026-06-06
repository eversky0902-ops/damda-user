-- 사업주 로고 필드 추가
ALTER TABLE business_owners 
ADD COLUMN logo_url text NULL;

COMMENT ON COLUMN business_owners.logo_url IS '사업주 로고 이미지 URL';
