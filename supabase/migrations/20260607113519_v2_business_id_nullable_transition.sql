-- 전환기: products.business_id를 nullable로 되돌림
-- 직전 데이터 마이그레이션(_v2_business_layer_data)에서 SET NOT NULL 했으나,
-- 각 앱의 상품 생성 경로를 점진적으로 wiring하는 동안 NULL 허용 필요.
-- 앱 전환 완료 후 최종 cleanup 마이그레이션에서 다시 SET NOT NULL + 구컬럼 제거 예정.
ALTER TABLE products ALTER COLUMN business_id DROP NOT NULL;
