-- A product may contain at most three images (including the representative image).
CREATE OR REPLACE FUNCTION public.enforce_product_image_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.product_images
    WHERE product_id = NEW.product_id
      AND (TG_OP <> 'UPDATE' OR id <> NEW.id)
  ) >= 3 THEN
    RAISE EXCEPTION 'PRODUCT_IMAGE_LIMIT_REACHED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_product_image_limit_trigger ON public.product_images;
CREATE TRIGGER enforce_product_image_limit_trigger
BEFORE INSERT OR UPDATE OF product_id ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.enforce_product_image_limit();

-- 2026-08 정책 변경: 기본 제휴 수수료를 12%로 통일합니다.
ALTER TABLE public.business_owners ALTER COLUMN commission_rate SET DEFAULT 12.00;
UPDATE public.business_owners SET commission_rate = 12.00 WHERE commission_rate = 10.00;
UPDATE public.site_settings SET value = '12', updated_at = now() WHERE key = 'default_commission_rate';

-- Product images use a shared public bucket. Business owners may manage only
-- the folder named with their own business owner id.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public', 'public', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Business owners upload own product images" ON storage.objects;
CREATE POLICY "Business owners upload own product images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.business_owners owner
    WHERE owner.id::text = (storage.foldername(name))[2]
      AND owner.auth_user_id = auth.uid()
      AND owner.status = 'active'
  )
);

DROP POLICY IF EXISTS "Business owners delete own product images" ON storage.objects;
CREATE POLICY "Business owners delete own product images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.business_owners owner
    WHERE owner.id::text = (storage.foldername(name))[2]
      AND owner.auth_user_id = auth.uid()
  )
);
