-- Expand the shared Business/Product model used by admin, owner console and public site.
-- Additive only: existing records, IDs and reservation/payment relationships remain intact.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS summary varchar(500),
  ADD COLUMN IF NOT EXISTS parking_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parking_notice text,
  ADD COLUMN IF NOT EXISTS facilities text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS common_guide text,
  ADD COLUMN IF NOT EXISTS common_precautions text;

COMMENT ON COLUMN public.businesses.summary IS '사업장 한줄소개';
COMMENT ON COLUMN public.businesses.introduction IS '사업장 상세소개';
COMMENT ON COLUMN public.businesses.facilities IS '사업장 공통 시설/서비스 코드 목록';
COMMENT ON COLUMN public.businesses.common_guide IS '사업장 공통 이용안내';
COMMENT ON COLUMN public.businesses.common_precautions IS '사업장 공통 주의사항';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS minimum_age integer,
  ADD COLUMN IF NOT EXISTS recommended_age_min integer,
  ADD COLUMN IF NOT EXISTS recommended_age_max integer,
  ADD COLUMN IF NOT EXISTS booking_start_date date,
  ADD COLUMN IF NOT EXISTS booking_end_date date,
  ADD COLUMN IF NOT EXISTS booking_cutoff_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS allow_same_day_booking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inclusions text,
  ADD COLUMN IF NOT EXISTS exclusions text,
  ADD COLUMN IF NOT EXISTS materials text,
  ADD COLUMN IF NOT EXISTS usage_method text,
  ADD COLUMN IF NOT EXISTS product_precautions text,
  ADD COLUMN IF NOT EXISTS reservation_notice text,
  ADD COLUMN IF NOT EXISTS refund_notice text,
  ADD COLUMN IF NOT EXISTS other_notice text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS products_public_business_order_idx
  ON public.products(business_id, is_visible, is_sold_out, display_order, created_at);

COMMENT ON COLUMN public.products.display_order IS '사업장 상세페이지 상품 노출순서. 낮을수록 먼저 표시';
COMMENT ON COLUMN public.products.booking_cutoff_hours IS '예약 시작 전 마감시간(시간 단위)';
COMMENT ON COLUMN public.products.allow_same_day_booking IS '당일 예약 허용 여부';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_management_price_check' AND conrelid = 'public.products'::regclass) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_management_price_check
      CHECK (original_price >= 0 AND sale_price >= 0 AND original_price >= sale_price) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_management_participants_check' AND conrelid = 'public.products'::regclass) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_management_participants_check
      CHECK (min_participants >= 1 AND max_participants >= min_participants) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_management_duration_check' AND conrelid = 'public.products'::regclass) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_management_duration_check
      CHECK (duration_minutes IS NULL OR duration_minutes >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_management_age_check' AND conrelid = 'public.products'::regclass) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_management_age_check CHECK (
      (minimum_age IS NULL OR minimum_age BETWEEN 0 AND 99)
      AND (recommended_age_min IS NULL OR recommended_age_min BETWEEN 0 AND 99)
      AND (recommended_age_max IS NULL OR recommended_age_max BETWEEN 0 AND 99)
      AND (recommended_age_min IS NULL OR recommended_age_max IS NULL OR recommended_age_max >= recommended_age_min)
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_management_booking_check' AND conrelid = 'public.products'::regclass) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_management_booking_check CHECK (
      booking_cutoff_hours BETWEEN 0 AND 720
      AND (booking_start_date IS NULL OR booking_end_date IS NULL OR booking_end_date >= booking_start_date)
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_management_display_order_check' AND conrelid = 'public.products'::regclass) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_management_display_order_check
      CHECK (display_order >= 0) NOT VALID;
  END IF;
END $$;

-- Prevent owner-side updates from moving products to another owner even when IDs are manipulated.
-- The existing a_set_and_validate_product_business_trigger additionally verifies business ownership.
DROP POLICY IF EXISTS "Business owners can update own products" ON public.products;
CREATE POLICY "Business owners can update own products" ON public.products
FOR UPDATE TO authenticated
USING (
  business_owner_id = public.current_business_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_id AND b.business_owner_id = public.current_business_owner_id()
  )
)
WITH CHECK (
  business_owner_id = public.current_business_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_id AND b.business_owner_id = public.current_business_owner_id()
  )
);
