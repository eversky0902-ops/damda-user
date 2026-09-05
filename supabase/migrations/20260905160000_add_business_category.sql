-- 사업장 단위의 분류를 관리한다. 상품별 분류와 별도로 사업장 목록/상세 노출에 사용한다.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS businesses_category_id_idx
  ON public.businesses(category_id);

COMMENT ON COLUMN public.businesses.category_id IS '사업장 대표 카테고리';
