-- Additive PartnerAccount -> Business -> Product structure.
-- Existing business owner, product, reservation, payment and settlement IDs stay unchanged.

CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES public.business_owners(id) ON DELETE RESTRICT,
  business_code text NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  business_number varchar(20),
  representative varchar(100),
  contact_name varchar(100),
  contact_phone varchar(20),
  email varchar(255),
  address varchar(500) NOT NULL DEFAULT '',
  address_detail varchar(200),
  zipcode varchar(10),
  latitude decimal(10,7),
  longitude decimal(10,7),
  logo_url text,
  introduction text,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Compatibility with the earlier lightweight businesses table already present
-- in some environments (name/address/thumbnail/intro/is_visible).
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_code text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_number varchar(20);
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS representative varchar(100);
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS contact_name varchar(100);
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS email varchar(255);
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS introduction text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'active';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.businesses'::regclass
      AND conname = 'businesses_status_check'
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_status_check
      CHECK (status IN ('active', 'inactive')) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS businesses_owner_idx ON public.businesses(business_owner_id);
CREATE INDEX IF NOT EXISTS businesses_status_idx ON public.businesses(status);
CREATE UNIQUE INDEX IF NOT EXISTS businesses_one_primary_per_owner_idx
  ON public.businesses(business_owner_id) WHERE is_primary;

DROP TRIGGER IF EXISTS update_businesses_updated_at ON public.businesses;
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.make_business_code(p_id uuid)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT 'DAMDA-B-' || upper(substr(replace(p_id::text, '-', ''), 1, 10));
$$;

UPDATE public.businesses SET business_code = public.make_business_code(id) WHERE business_code IS NULL;
ALTER TABLE public.businesses ALTER COLUMN business_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS businesses_business_code_unique
  ON public.businesses(business_code);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' AND column_name='thumbnail') THEN
    EXECUTE 'UPDATE public.businesses SET logo_url = thumbnail WHERE logo_url IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' AND column_name='intro') THEN
    EXECUTE 'UPDATE public.businesses SET introduction = intro WHERE introduction IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' AND column_name='is_visible') THEN
    EXECUTE 'UPDATE public.businesses SET status = CASE WHEN is_visible THEN ''active'' ELSE ''inactive'' END';
  END IF;
END $$;

ALTER TABLE public.businesses VALIDATE CONSTRAINT businesses_status_check;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY business_owner_id ORDER BY created_at, id) AS rn
  FROM public.businesses
), owners_without_primary AS (
  SELECT business_owner_id FROM public.businesses GROUP BY business_owner_id HAVING bool_or(is_primary) = false
)
UPDATE public.businesses b SET is_primary = true
FROM ranked r, owners_without_primary o
WHERE b.id = r.id AND b.business_owner_id = o.business_owner_id AND r.rn = 1;

-- Every existing owner receives one primary business copied from the legacy profile.
INSERT INTO public.businesses (
  id, business_owner_id, business_code, name, business_number, representative,
  contact_name, contact_phone, email, address, address_detail, zipcode,
  latitude, longitude, logo_url, status, is_primary, created_at, updated_at
)
SELECT
  bo.id, bo.id, public.make_business_code(bo.id), bo.name, bo.business_number,
  bo.representative, bo.contact_name, bo.contact_phone, bo.email, bo.address,
  bo.address_detail, bo.zipcode, bo.latitude, bo.longitude, bo.logo_url,
  bo.status, true, bo.created_at, bo.updated_at
FROM public.business_owners bo
WHERE NOT EXISTS (
  SELECT 1 FROM public.businesses b WHERE b.business_owner_id = bo.id
);

CREATE OR REPLACE FUNCTION public.create_primary_business_for_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.businesses (
    id, business_owner_id, business_code, name, business_number, representative,
    contact_name, contact_phone, email, address, address_detail, zipcode,
    latitude, longitude, logo_url, status, is_primary
  ) VALUES (
    NEW.id, NEW.id, public.make_business_code(NEW.id), NEW.name, NEW.business_number,
    NEW.representative, NEW.contact_name, NEW.contact_phone, NEW.email, NEW.address,
    NEW.address_detail, NEW.zipcode, NEW.latitude, NEW.longitude, NEW.logo_url,
    NEW.status, true
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_primary_business_after_owner ON public.business_owners;
CREATE TRIGGER create_primary_business_after_owner
  AFTER INSERT ON public.business_owners
  FOR EACH ROW EXECUTE FUNCTION public.create_primary_business_for_owner();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE RESTRICT;
UPDATE public.products p
SET business_id = (
  SELECT b.id FROM public.businesses b
  WHERE b.business_owner_id = p.business_owner_id
  ORDER BY b.is_primary DESC, b.created_at ASC, b.id
  LIMIT 1
)
WHERE p.business_id IS NULL;
ALTER TABLE public.products ALTER COLUMN business_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS products_business_id_idx ON public.products(business_id);

CREATE OR REPLACE FUNCTION public.set_and_validate_product_business()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_owner_id uuid;
BEGIN
  IF NEW.business_id IS NULL THEN
    SELECT id INTO NEW.business_id FROM public.businesses
    WHERE business_owner_id = NEW.business_owner_id
    ORDER BY is_primary DESC, created_at ASC LIMIT 1;
  END IF;
  SELECT business_owner_id INTO v_owner_id FROM public.businesses WHERE id = NEW.business_id;
  IF v_owner_id IS NULL OR v_owner_id <> NEW.business_owner_id THEN
    RAISE EXCEPTION 'PRODUCT_BUSINESS_OWNER_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_and_validate_product_business_trigger ON public.products;
DROP TRIGGER IF EXISTS a_set_and_validate_product_business_trigger ON public.products;
CREATE TRIGGER a_set_and_validate_product_business_trigger
  BEFORE INSERT OR UPDATE OF business_id, business_owner_id ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_and_validate_product_business();

-- The selected policy is ten products per business (not ten for the whole account).
CREATE OR REPLACE FUNCTION public.enforce_business_owner_product_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_product_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.business_id::text, 0));
  SELECT count(*) INTO v_product_count FROM public.products
  WHERE business_id = NEW.business_id AND (TG_OP = 'INSERT' OR id <> NEW.id);
  IF v_product_count >= 10 THEN RAISE EXCEPTION 'PRODUCT_LIMIT_REACHED'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_product_limit_per_business_owner ON public.products;
CREATE TRIGGER enforce_product_limit_per_business_owner
  BEFORE INSERT OR UPDATE OF business_id ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_business_owner_product_limit();

-- Selected policy: up to five gallery images per product.
CREATE OR REPLACE FUNCTION public.enforce_product_image_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.product_images
      WHERE product_id = NEW.product_id AND (TG_OP <> 'UPDATE' OR id <> NEW.id)) >= 5 THEN
    RAISE EXCEPTION 'PRODUCT_IMAGE_LIMIT_REACHED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_product_image_limit_trigger ON public.product_images;
CREATE TRIGGER enforce_product_image_limit_trigger
  BEFORE INSERT OR UPDATE OF product_id ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_image_limit();

-- Reservations retain legacy owner linkage and additionally snapshot the business.
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE RESTRICT;
UPDATE public.reservations r SET business_id = p.business_id
FROM public.products p WHERE p.id = r.product_id AND r.business_id IS NULL;
CREATE INDEX IF NOT EXISTS reservations_business_id_idx ON public.reservations(business_id);

CREATE OR REPLACE FUNCTION public.set_reservation_business()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  SELECT business_id, business_owner_id INTO NEW.business_id, NEW.business_owner_id
  FROM public.products WHERE id = NEW.product_id;
  IF NEW.business_id IS NULL THEN RAISE EXCEPTION 'RESERVATION_PRODUCT_NOT_FOUND'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS set_reservation_business_trigger ON public.reservations;
CREATE TRIGGER set_reservation_business_trigger
  BEFORE INSERT OR UPDATE OF product_id ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_reservation_business();

-- New settlements can be business-specific; historical owner-level rows remain valid.
ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE RESTRICT;
UPDATE public.settlements s
SET business_id = (
  SELECT b.id FROM public.businesses b
  WHERE b.business_owner_id = s.business_owner_id
  ORDER BY b.is_primary DESC, b.created_at ASC, b.id
  LIMIT 1
)
WHERE s.business_id IS NULL;
CREATE INDEX IF NOT EXISTS settlements_business_id_idx ON public.settlements(business_id);

ALTER TABLE public.review_replies ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
UPDATE public.review_replies rr SET business_id = p.business_id
FROM public.reviews r JOIN public.products p ON p.id = r.product_id
WHERE r.id = rr.review_id AND rr.business_id IS NULL;

-- Convert smart-place records from one row per owner to one row per business.
ALTER TABLE public.business_place_profiles ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.business_place_profiles ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
UPDATE public.business_place_profiles p
SET business_id = (
  SELECT b.id FROM public.businesses b WHERE b.business_owner_id = p.business_owner_id
  ORDER BY b.is_primary DESC, b.created_at, b.id LIMIT 1
)
WHERE p.business_id IS NULL;
ALTER TABLE public.business_place_profiles DROP CONSTRAINT IF EXISTS business_place_profiles_pkey;
ALTER TABLE public.business_place_profiles ADD CONSTRAINT business_place_profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.business_place_profiles ALTER COLUMN business_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS business_place_profiles_business_id_unique ON public.business_place_profiles(business_id);

ALTER TABLE public.business_hours ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
UPDATE public.business_hours h
SET business_id = (
  SELECT b.id FROM public.businesses b WHERE b.business_owner_id = h.business_owner_id
  ORDER BY b.is_primary DESC, b.created_at, b.id LIMIT 1
)
WHERE h.business_id IS NULL;
ALTER TABLE public.business_hours ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.business_hours DROP CONSTRAINT IF EXISTS business_hours_business_owner_id_day_of_week_key;
CREATE UNIQUE INDEX IF NOT EXISTS business_hours_business_day_unique ON public.business_hours(business_id, day_of_week);

ALTER TABLE public.business_closures ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
UPDATE public.business_closures c
SET business_id = (
  SELECT b.id FROM public.businesses b WHERE b.business_owner_id = c.business_owner_id
  ORDER BY b.is_primary DESC, b.created_at, b.id LIMIT 1
)
WHERE c.business_id IS NULL;
ALTER TABLE public.business_closures ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.business_closures DROP CONSTRAINT IF EXISTS business_closures_business_owner_id_closure_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS business_closures_business_date_unique ON public.business_closures(business_id, closure_date);

ALTER TABLE public.business_place_images ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
UPDATE public.business_place_images i
SET business_id = (
  SELECT b.id FROM public.businesses b WHERE b.business_owner_id = i.business_owner_id
  ORDER BY b.is_primary DESC, b.created_at, b.id LIMIT 1
)
WHERE i.business_id IS NULL;
ALTER TABLE public.business_place_images ALTER COLUMN business_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_business_place_image_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.business_place_images
      WHERE business_id = NEW.business_id AND (TG_OP <> 'UPDATE' OR id <> NEW.id)) >= 20 THEN
    RAISE EXCEPTION 'BUSINESS_PLACE_IMAGE_LIMIT_REACHED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_business_place_image_limit ON public.business_place_images;
CREATE TRIGGER enforce_business_place_image_limit
  BEFORE INSERT OR UPDATE OF business_id ON public.business_place_images
  FOR EACH ROW EXECUTE FUNCTION public.enforce_business_place_image_limit();

ALTER TABLE public.business_notices ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
UPDATE public.business_notices n
SET business_id = (
  SELECT b.id FROM public.businesses b WHERE b.business_owner_id = n.business_owner_id
  ORDER BY b.is_primary DESC, b.created_at, b.id LIMIT 1
)
WHERE n.business_id IS NULL;
ALTER TABLE public.business_notices ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reads active businesses" ON public.businesses;
CREATE POLICY "Public reads active businesses" ON public.businesses FOR SELECT TO anon, authenticated
  USING (status = 'active' OR business_owner_id = public.current_business_owner_id());
DROP POLICY IF EXISTS "Business owners create own businesses" ON public.businesses;
CREATE POLICY "Business owners create own businesses" ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (business_owner_id = public.current_business_owner_id());
DROP POLICY IF EXISTS "Business owners update own businesses" ON public.businesses;
CREATE POLICY "Business owners update own businesses" ON public.businesses FOR UPDATE TO authenticated
  USING (business_owner_id = public.current_business_owner_id())
  WITH CHECK (business_owner_id = public.current_business_owner_id());
DROP POLICY IF EXISTS "Admins manage businesses" ON public.businesses;
CREATE POLICY "Admins manage businesses" ON public.businesses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Business owners can insert own products" ON public.products;
CREATE POLICY "Business owners can insert own products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (
    business_owner_id = public.current_business_owner_id()
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.business_owner_id = public.current_business_owner_id())
  );
DROP POLICY IF EXISTS "Business owners can update own products" ON public.products;
CREATE POLICY "Business owners can update own products" ON public.products FOR UPDATE TO authenticated
  USING (business_owner_id = public.current_business_owner_id())
  WITH CHECK (
    business_owner_id = public.current_business_owner_id()
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.business_owner_id = public.current_business_owner_id())
  );

CREATE OR REPLACE FUNCTION public.delete_business_safely(p_business_id uuid, p_confirmation_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_business public.businesses%ROWTYPE; v_products integer; v_reservations integer;
BEGIN
  SELECT * INTO v_business FROM public.businesses WHERE id = p_business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BUSINESS_NOT_FOUND'; END IF;
  IF NOT (v_business.business_owner_id = public.current_business_owner_id()
          OR EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true)) THEN
    RAISE EXCEPTION 'BUSINESS_ACCESS_DENIED';
  END IF;
  IF btrim(COALESCE(p_confirmation_name, '')) <> v_business.name THEN
    RAISE EXCEPTION 'CONFIRMATION_NAME_MISMATCH';
  END IF;
  SELECT count(*) INTO v_products FROM public.products WHERE business_id = p_business_id;
  SELECT count(*) INTO v_reservations FROM public.reservations WHERE business_id = p_business_id;
  IF v_products > 0 OR v_reservations > 0 OR v_business.is_primary THEN
    RAISE EXCEPTION 'BUSINESS_HAS_RELATED_DATA_OR_IS_PRIMARY products=% reservations=%', v_products, v_reservations;
  END IF;
  DELETE FROM public.businesses WHERE id = p_business_id;
  RETURN jsonb_build_object('success', true, 'business_id', p_business_id);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_business_safely(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_business_safely(uuid, text) TO authenticated;

COMMENT ON TABLE public.businesses IS '고객에게 노출되는 사업장. 한 사업주 계정이 여러 사업장을 관리할 수 있다.';
COMMENT ON COLUMN public.products.business_id IS '상품이 실제로 속한 사업장';
