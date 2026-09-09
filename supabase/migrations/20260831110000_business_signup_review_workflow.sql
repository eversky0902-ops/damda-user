-- Business-owner signup review: add hold status and a staff memo.

ALTER TABLE public.business_owner_signup_requests
  ADD COLUMN IF NOT EXISTS review_note text;

ALTER TABLE public.business_owner_signup_requests
  DROP CONSTRAINT IF EXISTS business_owner_signup_requests_status_check;

ALTER TABLE public.business_owner_signup_requests
  ADD CONSTRAINT business_owner_signup_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'on_hold')) NOT VALID;

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
  IF v_request.status NOT IN ('pending', 'on_hold', 'rejected') THEN
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

CREATE OR REPLACE FUNCTION public.review_business_owner_signup(
  p_request_id uuid,
  p_status text,
  p_review_note text DEFAULT NULL,
  p_business_owner_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.business_owner_signup_requests%ROWTYPE;
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

  IF p_status = 'approved' THEN
    IF v_request.status = 'approved' THEN
      IF p_business_owner_id IS NOT NULL
         AND p_business_owner_id <> v_request.matched_business_owner_id THEN
        RAISE EXCEPTION 'BUSINESS_SIGNUP_REQUEST_MATCH_CANNOT_CHANGE';
      END IF;

      UPDATE public.business_owner_signup_requests
      SET review_note = NULLIF(btrim(p_review_note), ''),
          reviewed_by = auth.uid(),
          reviewed_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
      RETURN jsonb_build_object('success', true, 'status', 'approved');
    END IF;

    IF p_business_owner_id IS NULL THEN
      RAISE EXCEPTION 'BUSINESS_OWNER_REQUIRED';
    END IF;
    PERFORM public.approve_business_owner_signup(p_request_id, p_business_owner_id);
    UPDATE public.business_owner_signup_requests
    SET review_note = NULLIF(btrim(p_review_note), ''), updated_at = now()
    WHERE id = p_request_id;
    RETURN jsonb_build_object('success', true, 'status', 'approved');
  END IF;

  IF p_status NOT IN ('rejected', 'on_hold') THEN
    RAISE EXCEPTION 'INVALID_BUSINESS_SIGNUP_STATUS';
  END IF;

  IF v_request.status = 'approved' AND v_request.matched_business_owner_id IS NOT NULL THEN
    UPDATE public.business_owners
    SET status = 'inactive', updated_at = now()
    WHERE id = v_request.matched_business_owner_id;
  END IF;

  UPDATE public.business_owner_signup_requests
  SET status = p_status,
      review_note = NULLIF(btrim(p_review_note), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_business_owner_signup(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_business_owner_signup(uuid, text, text, uuid) TO authenticated;
