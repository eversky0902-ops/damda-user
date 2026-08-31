ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS facility_services jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.facility_services
  IS '상품별 시설·서비스 가능 여부. 키는 서비스 코드, 값은 true(가능) 또는 false(불가)입니다.';
