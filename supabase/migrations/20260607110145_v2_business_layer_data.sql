-- 사업자당 사업장 1개를 만들고 기존 상품을 연결한다.
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

UPDATE products p
SET business_id = b.id
FROM businesses b
WHERE b.business_owner_id = p.business_owner_id;

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

UPDATE products SET sale_type = 'time_slot' WHERE sale_type IS NULL;
ALTER TABLE products ALTER COLUMN business_id SET NOT NULL;
