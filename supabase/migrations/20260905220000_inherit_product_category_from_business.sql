BEGIN;

-- Some environments predate the business-level category field used by the
-- current business center. Keep the migration additive and idempotent.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS businesses_category_id_idx
  ON public.businesses(category_id);

CREATE OR REPLACE FUNCTION public.inherit_product_category_from_business()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_business_category_id uuid;
BEGIN
  -- An explicitly selected product category remains authoritative. Products
  -- created by the business center currently send NULL and inherit here.
  IF NEW.category_id IS NOT NULL OR NEW.business_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT b.category_id
  INTO v_business_category_id
  FROM public.businesses b
  WHERE b.id = NEW.business_id
    AND b.business_owner_id = NEW.business_owner_id;

  IF v_business_category_id IS NOT NULL THEN
    NEW.category_id := v_business_category_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS b_inherit_product_category_from_business ON public.products;
CREATE TRIGGER b_inherit_product_category_from_business
  BEFORE INSERT OR UPDATE OF business_id, business_owner_id, category_id
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_product_category_from_business();

CREATE OR REPLACE FUNCTION public.sync_business_category_to_inherited_products()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.category_id IS NOT DISTINCT FROM OLD.category_id THEN
    RETURN NEW;
  END IF;

  -- Follow later business-category changes only for products that were empty
  -- or still matched the previous business category. Explicitly different
  -- product categories are preserved.
  UPDATE public.products
  SET category_id = NEW.category_id,
      updated_at = now()
  WHERE business_id = NEW.id
    AND business_owner_id = NEW.business_owner_id
    AND (
      category_id IS NULL
      OR category_id IS NOT DISTINCT FROM OLD.category_id
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_business_category_to_inherited_products ON public.businesses;
CREATE TRIGGER sync_business_category_to_inherited_products
  AFTER UPDATE OF category_id
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_business_category_to_inherited_products();

-- Repair existing business-center products that were stored without a
-- category. Explicit product categories are intentionally not overwritten.
UPDATE public.products p
SET category_id = b.category_id,
    updated_at = now()
FROM public.businesses b
WHERE p.business_id = b.id
  AND p.business_owner_id = b.business_owner_id
  AND p.category_id IS NULL
  AND b.category_id IS NOT NULL;

COMMENT ON FUNCTION public.inherit_product_category_from_business()
  IS 'When a product category is omitted, inherit the category of its linked business.';

COMMENT ON FUNCTION public.sync_business_category_to_inherited_products()
  IS 'Propagate business category changes to products still using that inherited category.';

COMMIT;
