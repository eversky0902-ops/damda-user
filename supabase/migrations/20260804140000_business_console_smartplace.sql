-- Smart-place style business console features.

CREATE TABLE IF NOT EXISTS public.business_place_profiles (
  business_owner_id uuid PRIMARY KEY REFERENCES public.business_owners(id) ON DELETE CASCADE,
  introduction text,
  public_phone varchar(30),
  website_url text,
  directions text,
  reservation_notice text,
  auto_confirm_reservations boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES public.business_owners(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_closed boolean NOT NULL DEFAULT false,
  open_time time,
  close_time time,
  break_start time,
  break_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_owner_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.business_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES public.business_owners(id) ON DELETE CASCADE,
  closure_date date NOT NULL,
  reason varchar(200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_owner_id, closure_date)
);

CREATE TABLE IF NOT EXISTS public.business_place_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES public.business_owners(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption varchar(200),
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES public.business_owners(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  content text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.review_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL UNIQUE REFERENCES public.reviews(id) ON DELETE CASCADE,
  business_owner_id uuid NOT NULL REFERENCES public.business_owners(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_hours_owner_idx ON public.business_hours(business_owner_id);
CREATE INDEX IF NOT EXISTS business_closures_owner_date_idx ON public.business_closures(business_owner_id, closure_date);
CREATE INDEX IF NOT EXISTS business_place_images_owner_idx ON public.business_place_images(business_owner_id, sort_order);
CREATE INDEX IF NOT EXISTS business_notices_owner_idx ON public.business_notices(business_owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS review_replies_owner_idx ON public.review_replies(business_owner_id);

DROP TRIGGER IF EXISTS update_business_place_profiles_updated_at ON public.business_place_profiles;
CREATE TRIGGER update_business_place_profiles_updated_at BEFORE UPDATE ON public.business_place_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_business_hours_updated_at ON public.business_hours;
CREATE TRIGGER update_business_hours_updated_at BEFORE UPDATE ON public.business_hours
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_business_notices_updated_at ON public.business_notices;
CREATE TRIGGER update_business_notices_updated_at BEFORE UPDATE ON public.business_notices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_review_replies_updated_at ON public.review_replies;
CREATE TRIGGER update_review_replies_updated_at BEFORE UPDATE ON public.review_replies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.business_place_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_place_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_current_business_owner(p_business_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_owners
    WHERE id = p_business_owner_id AND auth_user_id = auth.uid() AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_business_owner(uuid) TO anon, authenticated;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'business_place_profiles','business_hours','business_closures',
    'business_place_images','business_notices','review_replies'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Business owners manage own %1$s" ON public.%1$I', table_name);
    EXECUTE format(
      'CREATE POLICY "Business owners manage own %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.is_current_business_owner(business_owner_id)) WITH CHECK (public.is_current_business_owner(business_owner_id))',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS "Public reads published %1$s" ON public.%1$I', table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Public reads place profiles" ON public.business_place_profiles;
CREATE POLICY "Public reads place profiles" ON public.business_place_profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public reads business hours" ON public.business_hours;
CREATE POLICY "Public reads business hours" ON public.business_hours FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public reads business closures" ON public.business_closures;
CREATE POLICY "Public reads business closures" ON public.business_closures FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public reads place images" ON public.business_place_images;
CREATE POLICY "Public reads place images" ON public.business_place_images FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public reads published business notices" ON public.business_notices;
CREATE POLICY "Public reads published business notices" ON public.business_notices FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "Public reads review replies" ON public.review_replies;
CREATE POLICY "Public reads review replies" ON public.review_replies FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.enforce_business_place_image_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.business_place_images WHERE business_owner_id = NEW.business_owner_id) >= 20 THEN
    RAISE EXCEPTION 'BUSINESS_PLACE_IMAGE_LIMIT_REACHED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_business_place_image_limit ON public.business_place_images;
CREATE TRIGGER enforce_business_place_image_limit BEFORE INSERT ON public.business_place_images
FOR EACH ROW EXECUTE FUNCTION public.enforce_business_place_image_limit();
