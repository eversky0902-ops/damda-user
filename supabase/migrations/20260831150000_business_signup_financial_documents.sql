-- Collect settlement-account details and required documents during business signup.

ALTER TABLE public.business_owner_signup_requests
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_holder text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS business_registration_storage_bucket text,
  ADD COLUMN IF NOT EXISTS business_registration_storage_path text,
  ADD COLUMN IF NOT EXISTS business_registration_file_name text,
  ADD COLUMN IF NOT EXISTS business_registration_file_size bigint,
  ADD COLUMN IF NOT EXISTS business_registration_mime_type text,
  ADD COLUMN IF NOT EXISTS bank_account_copy_storage_bucket text,
  ADD COLUMN IF NOT EXISTS bank_account_copy_storage_path text,
  ADD COLUMN IF NOT EXISTS bank_account_copy_file_name text,
  ADD COLUMN IF NOT EXISTS bank_account_copy_file_size bigint,
  ADD COLUMN IF NOT EXISTS bank_account_copy_mime_type text;

ALTER TABLE public.business_owner_documents
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-signup-documents',
  'business-signup-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Signup applicants upload business documents" ON storage.objects;
CREATE POLICY "Signup applicants upload business documents" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'business-signup-documents'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (storage.foldername(name))[2] IN ('business_registration', 'bank_account')
  );

DROP POLICY IF EXISTS "Signup applicants remove unsubmitted business documents" ON storage.objects;
CREATE POLICY "Signup applicants remove unsubmitted business documents" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (
    bucket_id = 'business-signup-documents'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (storage.foldername(name))[2] IN ('business_registration', 'bank_account')
  );

DROP POLICY IF EXISTS "Admins view business signup documents" ON storage.objects;
CREATE POLICY "Admins view business signup documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'business-signup-documents'
    AND EXISTS (
      SELECT 1 FROM public.admins admin
      WHERE admin.id = auth.uid() AND admin.is_active = true
    )
  );

CREATE OR REPLACE FUNCTION public.create_business_owner_signup_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_registration jsonb;
  v_bank_account_document jsonb;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', '') = 'business_owner_signup' THEN
    v_business_registration := COALESCE(NEW.raw_user_meta_data->'business_registration_document', '{}'::jsonb);
    v_bank_account_document := COALESCE(NEW.raw_user_meta_data->'bank_account_document', '{}'::jsonb);

    INSERT INTO public.business_owner_signup_requests (
      auth_user_id,
      email,
      business_name,
      business_number,
      representative,
      contact_name,
      contact_phone,
      bank_name,
      bank_holder,
      bank_account,
      business_registration_storage_bucket,
      business_registration_storage_path,
      business_registration_file_name,
      business_registration_file_size,
      business_registration_mime_type,
      bank_account_copy_storage_bucket,
      bank_account_copy_storage_path,
      bank_account_copy_file_name,
      bank_account_copy_file_size,
      bank_account_copy_mime_type
    ) VALUES (
      NEW.id,
      lower(btrim(NEW.email)),
      NEW.raw_user_meta_data->>'business_name',
      regexp_replace(NEW.raw_user_meta_data->>'business_number', '[^0-9]', '', 'g'),
      NEW.raw_user_meta_data->>'representative',
      NEW.raw_user_meta_data->>'contact_name',
      regexp_replace(NEW.raw_user_meta_data->>'contact_phone', '[^0-9]', '', 'g'),
      NULLIF(btrim(NEW.raw_user_meta_data->>'bank_name'), ''),
      NULLIF(btrim(NEW.raw_user_meta_data->>'bank_holder'), ''),
      NULLIF(regexp_replace(NEW.raw_user_meta_data->>'bank_account', '[^0-9]', '', 'g'), ''),
      NULLIF(v_business_registration->>'storage_bucket', ''),
      NULLIF(v_business_registration->>'storage_path', ''),
      NULLIF(v_business_registration->>'file_name', ''),
      CASE WHEN (v_business_registration->>'file_size') ~ '^[0-9]+$'
        THEN (v_business_registration->>'file_size')::bigint ELSE NULL END,
      NULLIF(v_business_registration->>'mime_type', ''),
      NULLIF(v_bank_account_document->>'storage_bucket', ''),
      NULLIF(v_bank_account_document->>'storage_path', ''),
      NULLIF(v_bank_account_document->>'file_name', ''),
      CASE WHEN (v_bank_account_document->>'file_size') ~ '^[0-9]+$'
        THEN (v_bank_account_document->>'file_size')::bigint ELSE NULL END,
      NULLIF(v_bank_account_document->>'mime_type', '')
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
      email = EXCLUDED.email,
      business_name = EXCLUDED.business_name,
      business_number = EXCLUDED.business_number,
      representative = EXCLUDED.representative,
      contact_name = EXCLUDED.contact_name,
      contact_phone = EXCLUDED.contact_phone,
      bank_name = EXCLUDED.bank_name,
      bank_holder = EXCLUDED.bank_holder,
      bank_account = EXCLUDED.bank_account,
      business_registration_storage_bucket = EXCLUDED.business_registration_storage_bucket,
      business_registration_storage_path = EXCLUDED.business_registration_storage_path,
      business_registration_file_name = EXCLUDED.business_registration_file_name,
      business_registration_file_size = EXCLUDED.business_registration_file_size,
      business_registration_mime_type = EXCLUDED.business_registration_mime_type,
      bank_account_copy_storage_bucket = EXCLUDED.bank_account_copy_storage_bucket,
      bank_account_copy_storage_path = EXCLUDED.bank_account_copy_storage_path,
      bank_account_copy_file_name = EXCLUDED.bank_account_copy_file_name,
      bank_account_copy_file_size = EXCLUDED.bank_account_copy_file_size,
      bank_account_copy_mime_type = EXCLUDED.bank_account_copy_mime_type,
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
      bank_name = COALESCE(NULLIF(btrim(v_request.bank_name), ''), bank_name),
      bank_holder = COALESCE(NULLIF(btrim(v_request.bank_holder), ''), bank_holder),
      bank_account = COALESCE(NULLIF(v_request.bank_account, ''), bank_account),
      status = 'active',
      updated_at = now()
  WHERE id = p_business_owner_id;

  IF v_request.business_registration_storage_path IS NOT NULL THEN
    DELETE FROM public.business_owner_documents
    WHERE business_owner_id = p_business_owner_id AND document_type = 'business_registration';

    INSERT INTO public.business_owner_documents (
      business_owner_id, document_type, file_name, file_url, file_size, mime_type,
      storage_bucket, storage_path, sort_order
    ) VALUES (
      p_business_owner_id,
      'business_registration',
      COALESCE(v_request.business_registration_file_name, '사업자등록증'),
      v_request.business_registration_storage_path,
      v_request.business_registration_file_size,
      v_request.business_registration_mime_type,
      COALESCE(v_request.business_registration_storage_bucket, 'business-signup-documents'),
      v_request.business_registration_storage_path,
      0
    );
  END IF;

  IF v_request.bank_account_copy_storage_path IS NOT NULL THEN
    DELETE FROM public.business_owner_documents
    WHERE business_owner_id = p_business_owner_id AND document_type = 'bank_account';

    INSERT INTO public.business_owner_documents (
      business_owner_id, document_type, file_name, file_url, file_size, mime_type,
      storage_bucket, storage_path, sort_order
    ) VALUES (
      p_business_owner_id,
      'bank_account',
      COALESCE(v_request.bank_account_copy_file_name, '통장사본'),
      v_request.bank_account_copy_storage_path,
      v_request.bank_account_copy_file_size,
      v_request.bank_account_copy_mime_type,
      COALESCE(v_request.bank_account_copy_storage_bucket, 'business-signup-documents'),
      v_request.bank_account_copy_storage_path,
      1
    );
  END IF;

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
