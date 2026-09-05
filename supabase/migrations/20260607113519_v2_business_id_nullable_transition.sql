-- 사업장 연결 경로가 전환되는 동안에는 상품의 business_id를 선택 값으로 유지한다.
ALTER TABLE products ALTER COLUMN business_id DROP NOT NULL;
