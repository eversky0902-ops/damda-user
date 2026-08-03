-- Business-owner self signup and admin matching.

ALTER TABLE public.business_owners
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS business_owners_auth_user_id_unique
  ON public.business_owners(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Preserve all existing accounts whose profile id already equals the auth user id.
UPDATE public.business_owners bo
SET auth_user_id = bo.id
WHERE bo.auth_user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = bo.id);

CREATE OR REPLACE FUNCTION public.current_business_owner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM public.business_owners
  WHERE auth_user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS public.business_owner_signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  business_name text NOT NULL,
  business_number text NOT NULL,
  representative text NOT NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  matched_business_owner_id uuid REFERENCES public.business_owners(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.admins(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_owner_signup_requests_status_idx
  ON public.business_owner_signup_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS business_owner_signup_requests_business_number_idx
  ON public.business_owner_signup_requests(business_number);

ALTER TABLE public.business_owner_signup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicants can view own business signup" ON public.business_owner_signup_requests;
CREATE POLICY "Applicants can view own business signup"
  ON public.business_owner_signup_requests FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view business signup requests" ON public.business_owner_signup_requests;
CREATE POLICY "Admins can view business signup requests"
  ON public.business_owner_signup_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can update business signup requests" ON public.business_owner_signup_requests;
CREATE POLICY "Admins can update business signup requests"
  ON public.business_owner_signup_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION public.create_business_owner_signup_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', '') = 'business_owner_signup' THEN
    INSERT INTO public.business_owner_signup_requests (
      auth_user_id,
      email,
      business_name,
      business_number,
      representative,
      contact_name,
      contact_phone
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'business_name',
      regexp_replace(NEW.raw_user_meta_data->>'business_number', '[^0-9]', '', 'g'),
      NEW.raw_user_meta_data->>'representative',
      NEW.raw_user_meta_data->>'contact_name',
      regexp_replace(NEW.raw_user_meta_data->>'contact_phone', '[^0-9]', '', 'g')
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
      email = EXCLUDED.email,
      business_name = EXCLUDED.business_name,
      business_number = EXCLUDED.business_number,
      representative = EXCLUDED.representative,
      contact_name = EXCLUDED.contact_name,
      contact_phone = EXCLUDED.contact_phone,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_business_owner_signup ON auth.users;
CREATE TRIGGER on_business_owner_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_business_owner_signup_request();

CREATE OR REPLACE FUNCTION public.approve_business_owner_signup(
  p_request_id uuid,
  p_business_owner_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.business_owner_signup_requests%ROWTYPE;
  v_previous_auth_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()) THEN
    RAISE EXCEPTION '관리자만 가입 신청을 승인할 수 있습니다.';
  END IF;

  SELECT * INTO v_request
  FROM public.business_owner_signup_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '가입 신청을 찾을 수 없습니다.';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION '이미 처리된 가입 신청입니다.';
  END IF;

  SELECT auth_user_id INTO v_previous_auth_user_id
  FROM public.business_owners
  WHERE id = p_business_owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '매칭할 사업주를 찾을 수 없습니다.';
  END IF;

  UPDATE public.business_owners
  SET auth_user_id = v_request.auth_user_id,
      status = 'active',
      updated_at = now()
  WHERE id = p_business_owner_id;

  IF v_previous_auth_user_id IS NOT NULL
     AND v_previous_auth_user_id <> v_request.auth_user_id THEN
    DELETE FROM public.user_roles
    WHERE id = v_previous_auth_user_id AND role = 'business_owner';
  END IF;

  INSERT INTO public.user_roles (id, role)
  VALUES (v_request.auth_user_id, 'business_owner')
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.business_owner_signup_requests
  SET status = 'approved',
      matched_business_owner_id = p_business_owner_id,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'business_owner_id', p_business_owner_id,
    'auth_user_id', v_request.auth_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_business_owner_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_business_owner_signup(uuid, uuid) TO authenticated;

-- Existing owner-scoped RLS policies now resolve the matched business owner id.
DROP POLICY IF EXISTS "Business owners can view own profile" ON public.business_owners;
CREATE POLICY "Business owners can view own profile" ON public.business_owners FOR SELECT
  USING (id = public.current_business_owner_id());

DROP POLICY IF EXISTS "Business owners can update own profile" ON public.business_owners;
CREATE POLICY "Business owners can update own profile" ON public.business_owners FOR UPDATE
  USING (id = public.current_business_owner_id())
  WITH CHECK (id = public.current_business_owner_id());

DROP POLICY IF EXISTS "Business owners can insert own profile" ON public.business_owners;

DROP POLICY IF EXISTS "Business owners can view own commission history" ON public.commission_histories;
CREATE POLICY "Business owners can view own commission history" ON public.commission_histories FOR SELECT
  USING (business_owner_id = public.current_business_owner_id());

DROP POLICY IF EXISTS "Daycares can view visible products" ON public.products;
CREATE POLICY "Daycares can view visible products" ON public.products FOR SELECT
  USING (is_visible = true OR business_owner_id = public.current_business_owner_id());

DROP POLICY IF EXISTS "Business owners can insert own products" ON public.products;
CREATE POLICY "Business owners can insert own products" ON public.products FOR INSERT
  WITH CHECK (business_owner_id = public.current_business_owner_id() AND is_business_owner());

DROP POLICY IF EXISTS "Business owners can update own products" ON public.products;
CREATE POLICY "Business owners can update own products" ON public.products FOR UPDATE
  USING (business_owner_id = public.current_business_owner_id())
  WITH CHECK (business_owner_id = public.current_business_owner_id());

DROP POLICY IF EXISTS "Business owners can delete own products" ON public.products;
CREATE POLICY "Business owners can delete own products" ON public.products FOR DELETE
  USING (business_owner_id = public.current_business_owner_id());

DROP POLICY IF EXISTS "Business owners can manage own product images" ON public.product_images;
CREATE POLICY "Business owners can manage own product images" ON public.product_images FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND p.business_owner_id = public.current_business_owner_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND p.business_owner_id = public.current_business_owner_id()
  ));

DROP POLICY IF EXISTS "Business owners can manage own product options" ON public.product_options;
CREATE POLICY "Business owners can manage own product options" ON public.product_options FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_options.product_id
      AND p.business_owner_id = public.current_business_owner_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_options.product_id
      AND p.business_owner_id = public.current_business_owner_id()
  ));

DROP POLICY IF EXISTS "Business owners can manage own unavailable dates" ON public.product_unavailable_dates;
CREATE POLICY "Business owners can manage own unavailable dates" ON public.product_unavailable_dates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_unavailable_dates.product_id
      AND p.business_owner_id = public.current_business_owner_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_unavailable_dates.product_id
      AND p.business_owner_id = public.current_business_owner_id()
  ));

DROP POLICY IF EXISTS "Business owners can view reservations for their products" ON public.reservations;
CREATE POLICY "Business owners can view reservations for their products" ON public.reservations FOR SELECT
  USING (business_owner_id = public.current_business_owner_id());

DROP POLICY IF EXISTS "Business owners can update own reservations" ON public.reservations;
CREATE POLICY "Business owners can update own reservations" ON public.reservations FOR UPDATE
  USING (business_owner_id = public.current_business_owner_id())
  WITH CHECK (business_owner_id = public.current_business_owner_id());

DROP POLICY IF EXISTS "Users can view reservation options" ON public.reservation_options;
CREATE POLICY "Users can view reservation options" ON public.reservation_options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.id = reservation_options.reservation_id
      AND (r.daycare_id = auth.uid() OR r.business_owner_id = public.current_business_owner_id())
  ));

DROP POLICY IF EXISTS "Business owners can view payments for their products" ON public.payments;
CREATE POLICY "Business owners can view payments for their products" ON public.payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.id = payments.reservation_id
      AND r.business_owner_id = public.current_business_owner_id()
  ));

DROP POLICY IF EXISTS "Business owners can view refunds for their products" ON public.refunds;
CREATE POLICY "Business owners can view refunds for their products" ON public.refunds FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.id = refunds.reservation_id
      AND r.business_owner_id = public.current_business_owner_id()
  ));

DROP POLICY IF EXISTS "Business owners can view own settlements" ON public.settlements;
CREATE POLICY "Business owners can view own settlements" ON public.settlements FOR SELECT
  USING (business_owner_id = public.current_business_owner_id());

DROP POLICY IF EXISTS bo_insert_own ON public.product_preview_tokens;
CREATE POLICY bo_insert_own ON public.product_preview_tokens FOR INSERT TO authenticated
  WITH CHECK (
    business_owner_id = public.current_business_owner_id()
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND p.business_owner_id = public.current_business_owner_id()
    )
  );
