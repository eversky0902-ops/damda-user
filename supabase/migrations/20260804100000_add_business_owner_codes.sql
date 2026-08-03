-- Human-readable business-owner codes and code-verified account matching.

CREATE SEQUENCE IF NOT EXISTS public.business_owner_code_seq START WITH 1;

ALTER TABLE public.business_owners
  ADD COLUMN IF NOT EXISTS owner_code varchar(20);

UPDATE public.business_owners
SET owner_code = 'DAMDA-' || lpad(nextval('public.business_owner_code_seq')::text, 6, '0')
WHERE owner_code IS NULL;

ALTER TABLE public.business_owners
  ALTER COLUMN owner_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS business_owners_owner_code_unique
  ON public.business_owners(owner_code);

CREATE OR REPLACE FUNCTION public.assign_business_owner_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_code IS NULL OR btrim(NEW.owner_code) = '' THEN
    NEW.owner_code := 'DAMDA-' || lpad(nextval('public.business_owner_code_seq')::text, 6, '0');
  ELSE
    NEW.owner_code := upper(btrim(NEW.owner_code));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_business_owner_code ON public.business_owners;
CREATE TRIGGER set_business_owner_code
  BEFORE INSERT OR UPDATE OF owner_code ON public.business_owners
  FOR EACH ROW EXECUTE FUNCTION public.assign_business_owner_code();

ALTER TABLE public.business_owner_signup_requests
  ADD COLUMN IF NOT EXISTS owner_code varchar(20);

CREATE INDEX IF NOT EXISTS business_owner_signup_requests_owner_code_idx
  ON public.business_owner_signup_requests(owner_code, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_business_owner_signup_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', '') = 'business_owner_signup' THEN
    INSERT INTO public.business_owner_signup_requests (
      auth_user_id, email, owner_code, business_name, business_number,
      representative, contact_name, contact_phone
    ) VALUES (
      NEW.id,
      NEW.email,
      upper(btrim(NEW.raw_user_meta_data->>'owner_code')),
      NEW.raw_user_meta_data->>'business_name',
      regexp_replace(NEW.raw_user_meta_data->>'business_number', '[^0-9]', '', 'g'),
      NEW.raw_user_meta_data->>'representative',
      NEW.raw_user_meta_data->>'contact_name',
      regexp_replace(NEW.raw_user_meta_data->>'contact_phone', '[^0-9]', '', 'g')
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
      email = EXCLUDED.email,
      owner_code = EXCLUDED.owner_code,
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
  v_owner public.business_owners%ROWTYPE;
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

  SELECT * INTO v_owner
  FROM public.business_owners
  WHERE id = p_business_owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '매칭할 사업주를 찾을 수 없습니다.';
  END IF;
  IF v_request.owner_code IS NULL OR upper(btrim(v_request.owner_code)) <> v_owner.owner_code THEN
    RAISE EXCEPTION '가입 신청의 사업주 코드가 선택한 사업주와 일치하지 않습니다.';
  END IF;

  v_previous_auth_user_id := v_owner.auth_user_id;

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
    'auth_user_id', v_request.auth_user_id,
    'owner_code', v_owner.owner_code
  );
END;
$$;

GRANT USAGE, SELECT ON SEQUENCE public.business_owner_code_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_business_owner_signup(uuid, uuid) TO authenticated;
