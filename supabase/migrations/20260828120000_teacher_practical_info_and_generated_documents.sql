-- Teacher-facing practical product information and reservation-based documents.
-- Additive only. Existing products, reservations and issued data are not rewritten.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS experience_environment text,
  ADD COLUMN IF NOT EXISTS operates_in_rain boolean,
  ADD COLUMN IF NOT EXISTS rain_alternative text,
  ADD COLUMN IF NOT EXISTS bus_accessible boolean,
  ADD COLUMN IF NOT EXISTS bus_parking_available boolean,
  ADD COLUMN IF NOT EXISTS dropoff_space_available boolean,
  ADD COLUMN IF NOT EXISTS meal_available boolean,
  ADD COLUMN IF NOT EXISTS lunchbox_allowed boolean,
  ADD COLUMN IF NOT EXISTS restroom_info text,
  ADD COLUMN IF NOT EXISTS child_restroom_available boolean,
  ADD COLUMN IF NOT EXISTS teacher_supplies text,
  ADD COLUMN IF NOT EXISTS child_supplies text,
  ADD COLUMN IF NOT EXISTS provided_supplies text,
  ADD COLUMN IF NOT EXISTS accessibility_info text,
  ADD COLUMN IF NOT EXISTS meeting_point text,
  ADD COLUMN IF NOT EXISTS field_contact text,
  ADD COLUMN IF NOT EXISTS teacher_notes text,
  ADD COLUMN IF NOT EXISTS clothing_guidance text,
  ADD COLUMN IF NOT EXISTS meal_guidance text,
  ADD COLUMN IF NOT EXISTS transportation_guidance text,
  ADD COLUMN IF NOT EXISTS guardian_notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_experience_environment_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_experience_environment_check
      CHECK (experience_environment IS NULL OR experience_environment IN ('indoor', 'outdoor', 'mixed')) NOT VALID;
  END IF;
END $$;

INSERT INTO public.site_settings (key, value, description)
VALUES (
  'document_publisher',
  '{"company_name":"담다","business_number":"660-08-02811","representative":"이승규"}'::jsonb,
  '견적서 및 대금명세서 발행자 정보'
)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Admins can read site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can insert site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow public read access to site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Active admins update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Active admins insert site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Active admins update site settings" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true));
CREATE POLICY "Active admins insert site settings" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true));

CREATE SEQUENCE IF NOT EXISTS public.generated_document_number_seq;

CREATE OR REPLACE FUNCTION public.next_generated_document_number(p_type text)
RETURNS text LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  SELECT upper(left(regexp_replace(p_type, '[^a-zA-Z]', '', 'g'), 3))
    || '-' || to_char(current_date, 'YYYYMMDD')
    || '-' || lpad(nextval('public.generated_document_number_seq')::text, 6, '0');
$$;

REVOKE ALL ON FUNCTION public.next_generated_document_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_generated_document_number(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text NOT NULL UNIQUE,
  document_type text NOT NULL CHECK (document_type IN (
    'quotation', 'payment_statement', 'family_letter', 'experience_notice',
    'venue_guide', 'parent_education', 'safety_education'
  )),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'archived')),
  title text NOT NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE RESTRICT,
  daycare_id uuid NOT NULL REFERENCES public.daycares(id) ON DELETE RESTRICT,
  business_owner_id uuid REFERENCES public.business_owners(id) ON DELETE RESTRICT,
  business_id uuid REFERENCES public.businesses(id) ON DELETE RESTRICT,
  reservation_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  publisher_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  editable_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generated_documents_daycare_idx
  ON public.generated_documents(daycare_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generated_documents_reservation_idx
  ON public.generated_documents(reservation_id);
CREATE INDEX IF NOT EXISTS generated_documents_owner_idx
  ON public.generated_documents(business_owner_id, status);

CREATE OR REPLACE FUNCTION public.prepare_generated_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reservation public.reservations%ROWTYPE;
BEGIN
  IF NEW.document_number IS NULL OR btrim(NEW.document_number) = '' THEN
    NEW.document_number := public.next_generated_document_number(NEW.document_type);
  END IF;

  IF NEW.reservation_id IS NOT NULL THEN
    SELECT * INTO v_reservation FROM public.reservations WHERE id = NEW.reservation_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'DOCUMENT_RESERVATION_NOT_FOUND'; END IF;
    IF auth.uid() IS NOT NULL AND v_reservation.daycare_id <> auth.uid()
       AND NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true) THEN
      RAISE EXCEPTION 'DOCUMENT_RESERVATION_ACCESS_DENIED';
    END IF;
    NEW.daycare_id := v_reservation.daycare_id;
    NEW.business_owner_id := v_reservation.business_owner_id;
    NEW.business_id := v_reservation.business_id;
  ELSIF auth.uid() IS NOT NULL
        AND NEW.daycare_id <> auth.uid()
        AND NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'DOCUMENT_DAYCARE_ACCESS_DENIED';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'issued' THEN
    IF NEW.reservation_snapshot IS DISTINCT FROM OLD.reservation_snapshot
       OR NEW.publisher_snapshot IS DISTINCT FROM OLD.publisher_snapshot
       OR NEW.editable_content IS DISTINCT FROM OLD.editable_content THEN
      RAISE EXCEPTION 'ISSUED_DOCUMENT_IS_IMMUTABLE';
    END IF;
  END IF;

  IF NEW.status = 'issued' AND NEW.issued_at IS NULL THEN NEW.issued_at := now(); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_generated_document_trigger ON public.generated_documents;
CREATE TRIGGER prepare_generated_document_trigger
  BEFORE INSERT OR UPDATE ON public.generated_documents
  FOR EACH ROW EXECUTE FUNCTION public.prepare_generated_document();

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Daycares read own generated documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Daycares create own generated documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Daycares update own draft documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Owners read relevant issued documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Admins manage generated documents" ON public.generated_documents;
CREATE POLICY "Daycares read own generated documents" ON public.generated_documents
  FOR SELECT TO authenticated USING (daycare_id = auth.uid());
CREATE POLICY "Daycares create own generated documents" ON public.generated_documents
  FOR INSERT TO authenticated WITH CHECK (daycare_id = auth.uid());
CREATE POLICY "Daycares update own draft documents" ON public.generated_documents
  FOR UPDATE TO authenticated USING (daycare_id = auth.uid() AND status = 'draft')
  WITH CHECK (daycare_id = auth.uid() AND status IN ('draft', 'issued'));
CREATE POLICY "Owners read relevant issued documents" ON public.generated_documents
  FOR SELECT TO authenticated USING (
    status = 'issued'
    AND business_owner_id = public.current_business_owner_id()
    AND document_type IN ('quotation', 'payment_statement', 'venue_guide')
  );
CREATE POLICY "Admins manage generated documents" ON public.generated_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true));

COMMENT ON TABLE public.generated_documents IS '예약 및 기관 데이터를 snapshot으로 보존하는 행정 문서';
COMMENT ON COLUMN public.generated_documents.reservation_snapshot IS '문서 생성 시점의 예약·상품·업체·기관 정보';
COMMENT ON COLUMN public.generated_documents.publisher_snapshot IS '발행 시 적용된 담다 발행자 정보';
