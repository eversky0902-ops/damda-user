-- Keep owner codes internal and match console signup requests by email.

DROP INDEX IF EXISTS public.business_owner_signup_requests_owner_code_idx;

ALTER TABLE public.business_owner_signup_requests
  DROP COLUMN IF EXISTS owner_code;

CREATE OR REPLACE FUNCTION public.create_business_owner_signup_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', '') = 'business_owner_signup' THEN
    INSERT INTO public.business_owner_signup_requests (
      auth_user_id, email, business_name, business_number,
      representative, contact_name, contact_phone
    ) VALUES (
      NEW.id,
      lower(btrim(NEW.email)),
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
  IF NOT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  SELECT * INTO v_request
  FROM public.business_owner_signup_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_SIGNUP_REQUEST_NOT_FOUND';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'BUSINESS_SIGNUP_REQUEST_ALREADY_PROCESSED';
  END IF;

  SELECT * INTO v_owner
  FROM public.business_owners
  WHERE id = p_business_owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_OWNER_NOT_FOUND';
  END IF;
  IF lower(btrim(v_request.email)) <> lower(btrim(v_owner.email)) THEN
    RAISE EXCEPTION 'BUSINESS_OWNER_EMAIL_MISMATCH';
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
    'owner_code', v_owner.owner_code,
    'email', v_owner.email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_business_owner_signup(uuid, uuid) TO authenticated;
