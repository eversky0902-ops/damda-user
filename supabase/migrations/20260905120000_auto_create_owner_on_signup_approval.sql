-- The admin review UI no longer asks an operator to manually match an owner.
-- When an approved signup has no owner yet, provision it from the reviewed
-- application. Existing owners are reused only through an explicit/existing
-- relationship; conflicting email or business numbers are rejected.
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
  v_business_owner_id uuid;
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
      UPDATE public.business_owner_signup_requests
      SET review_note = NULLIF(btrim(p_review_note), ''),
          reviewed_by = auth.uid(),
          reviewed_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
      RETURN jsonb_build_object('success', true, 'status', 'approved');
    END IF;

    v_business_owner_id := COALESCE(
      v_request.matched_business_owner_id,
      p_business_owner_id
    );

    IF v_business_owner_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.business_owners
         WHERE id = v_business_owner_id
       ) THEN
      IF v_business_owner_id <> v_request.auth_user_id THEN
        RAISE EXCEPTION 'BUSINESS_OWNER_NOT_FOUND';
      END IF;
      v_business_owner_id := NULL;
    END IF;

    IF v_business_owner_id IS NULL THEN
      SELECT id INTO v_business_owner_id
      FROM public.business_owners
      WHERE auth_user_id = v_request.auth_user_id
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF v_business_owner_id IS NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.business_owners
        WHERE lower(btrim(email)) = lower(btrim(v_request.email))
           OR business_number = v_request.business_number
      ) THEN
        RAISE EXCEPTION 'BUSINESS_OWNER_SIGNUP_CONFLICT';
      END IF;

      INSERT INTO public.business_owners (
        id,
        auth_user_id,
        email,
        name,
        business_number,
        representative,
        contact_name,
        contact_phone,
        address,
        bank_name,
        bank_holder,
        bank_account,
        status
      ) VALUES (
        v_request.auth_user_id,
        v_request.auth_user_id,
        lower(btrim(v_request.email)),
        btrim(v_request.business_name),
        v_request.business_number,
        btrim(v_request.representative),
        btrim(v_request.contact_name),
        v_request.contact_phone,
        '',
        NULLIF(btrim(v_request.bank_name), ''),
        NULLIF(btrim(v_request.bank_holder), ''),
        NULLIF(v_request.bank_account, ''),
        'active'
      )
      RETURNING id INTO v_business_owner_id;
    END IF;

    PERFORM public.approve_business_owner_signup(
      p_request_id,
      v_business_owner_id
    );

    UPDATE public.business_owner_signup_requests
    SET review_note = NULLIF(btrim(p_review_note), ''),
        updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'approved',
      'business_owner_id', v_business_owner_id
    );
  END IF;

  IF p_status NOT IN ('rejected', 'on_hold') THEN
    RAISE EXCEPTION 'INVALID_BUSINESS_SIGNUP_STATUS';
  END IF;

  IF v_request.status = 'approved'
     AND v_request.matched_business_owner_id IS NOT NULL THEN
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

REVOKE ALL ON FUNCTION public.review_business_owner_signup(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_business_owner_signup(uuid, text, text, uuid) TO authenticated;
