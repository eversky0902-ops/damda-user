-- =====================================================================
-- 2차개발 [2/2 데이터] 사업장 계층 + 판매방식 데이터 이관
-- 선행: 20260607195812_v2_business_layer_schema
-- 설계: docs/설계_사업장구조-판매방식_데이터모델.md
-- 현재 데이터: 사업자 1 ≈ 사업장 1 ≈ 상품 1 → 사업자당 사업장 1개 생성 전략
-- =====================================================================

-- 1) 사업자당 사업장 1개 생성
--    주소/위치는 대표 상품(가장 먼저 등록된) 우선, 없으면 사업자 정보 사용
INSERT INTO businesses (business_owner_id, name, address, address_detail, zipcode, latitude, longitude, region, contact_phone, is_visible)
SELECT
  bo.id,
  bo.name,
  COALESCE(p.address, bo.address),
  COALESCE(p.address_detail, bo.address_detail),
  bo.zipcode,
  COALESCE(p.latitude, bo.latitude),
  COALESCE(p.longitude, bo.longitude),
  p.region,
  bo.contact_phone,
  true
FROM business_owners bo
LEFT JOIN LATERAL (
  SELECT address, address_detail, latitude, longitude, region
  FROM products pp
  WHERE pp.business_owner_id = bo.id
  ORDER BY pp.created_at NULLS LAST
  LIMIT 1
) p ON true;

-- 2) 상품 → 사업장 연결 (사업자당 사업장 1개라 매핑 모호성 없음)
UPDATE products p
SET business_id = b.id
FROM businesses b
WHERE b.business_owner_id = p.business_owner_id;

-- 3) available_time_slots(jsonb) → product_schedules 정규화
--    day_of_week = Postgres DOW(0=일~6=토)로 정규화(현 데이터는 월~금=1~5)
--    slot 정원 = 1 (시간대 1팀 고정)
--    customSlots 없으면(mode auto/null) start 시각을 기본 슬롯으로 사용
INSERT INTO product_schedules (product_id, day_of_week, slot_time, capacity, is_active)
SELECT
  p.id,
  ((elem->>'day')::int % 7),
  slot::time,
  1,
  true
FROM products p
CROSS JOIN LATERAL jsonb_array_elements(p.available_time_slots) AS elem
CROSS JOIN LATERAL (
  SELECT CASE
    WHEN jsonb_typeof(elem->'customSlots') = 'array' AND jsonb_array_length(elem->'customSlots') > 0
      THEN ARRAY(SELECT jsonb_array_elements_text(elem->'customSlots'))
    WHEN (elem->>'start') IS NOT NULL AND (elem->>'start') <> ''
      THEN ARRAY[elem->>'start']
    ELSE ARRAY[]::text[]
  END AS slots
) s
CROSS JOIN LATERAL unnest(s.slots) AS slot
WHERE jsonb_typeof(p.available_time_slots) = 'array';

-- 4) 판매방식: 기존 상품은 전부 시간대별(time_slot) — 스키마 DEFAULT로 이미 설정.
--    (명시적 보강: 혹시 NULL이면 time_slot)
UPDATE products SET sale_type = 'time_slot' WHERE sale_type IS NULL;

-- 5) 모든 상품이 사업장에 연결됐으므로 business_id NOT NULL 강제
ALTER TABLE products ALTER COLUMN business_id SET NOT NULL;

-- 참고: product_unavailable_dates.kind 는 스키마 마이그레이션의 DEFAULT 'closed'로
--       기존 행이 자동 백필됨 → 별도 작업 불필요.
