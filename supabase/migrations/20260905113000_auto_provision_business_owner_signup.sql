-- Self-signup accounts are available immediately, while the application and
-- attached documents remain visible to administrators for later review.
CREATE OR REPLACE FUNCTION public.create_business_owner_signup_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_number text;
  v_contact_phone text;
  v_bank_account text;
  v_business_registration jsonb;
  v_bank_account_document jsonb;
  v_business_registration_path text;
  v_bank_account_path text;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', '') <> 'business_owner_signup' THEN
    RETURN NEW;
  END IF;

  v_business_number := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'business_number', ''), '[^0-9]', '', 'g');
  v_contact_phone := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'contact_phone', ''), '[^0-9]', '', 'g');
  v_bank_account := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'bank_account', ''), '[^0-9]', '', 'g');
  v_business_registration := COALESCE(NEW.raw_user_meta_data->'business_registration_document', '{}'::jsonb);
  v_bank_account_document := COALESCE(NEW.raw_user_meta_data->'bank_account_document', '{}'::jsonb);
  v_business_registration_path := NULLIF(v_business_registration->>'storage_path', '');
  v_bank_account_path := NULLIF(v_bank_account_document->>'storage_path', '');

  IF NULLIF(btrim(COALESCE(NEW.email, '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'business_name', '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'representative', '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'contact_name', '')), '') IS NULL
     OR v_business_number !~ '^[0-9]{10}$'
     OR length(v_contact_phone) < 9
     OR NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'bank_name', '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'bank_holder', '')), '') IS NULL
     OR length(v_bank_account) < 6 THEN
    RAISE EXCEPTION 'BUSINESS_SIGNUP_REQUIRED_FIELDS_INVALID';
  END IF;

  IF COALESCE(v_business_registration->>'storage_bucket', '') <> 'business-signup-documents'
     OR COALESCE(v_bank_account_document->>'storage_bucket', '') <> 'business-signup-documents'
     OR v_business_registration_path IS NULL
     OR v_bank_account_path IS NULL
     OR COALESCE(v_business_registration->>'mime_type', '') NOT IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
     OR COALESCE(v_bank_account_document->>'mime_type', '') NOT IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') THEN
    RAISE EXCEPTION 'BUSINESS_SIGNUP_DOCUMENTS_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'business-signup-documents' AND name = v_business_registration_path
  ) OR NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'business-signup-documents' AND name = v_bank_account_path
  ) THEN
    RAISE EXCEPTION 'BUSINESS_SIGNUP_DOCUMENTS_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_owners
    WHERE lower(email) = lower(NEW.email) OR business_number = v_business_number
  ) THEN
    RAISE EXCEPTION 'BUSINESS_OWNER_ALREADY_REGISTERED';
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
    NEW.id,
    NEW.id,
    lower(btrim(NEW.email)),
    btrim(NEW.raw_user_meta_data->>'business_name'),
    v_business_number,
    btrim(NEW.raw_user_meta_data->>'representative'),
    btrim(NEW.raw_user_meta_data->>'contact_name'),
    v_contact_phone,
    '',
    btrim(NEW.raw_user_meta_data->>'bank_name'),
    btrim(NEW.raw_user_meta_data->>'bank_holder'),
    v_bank_account,
    'active'
  );

  INSERT INTO public.user_roles (id, role)
  VALUES (NEW.id, 'business_owner')
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

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
    bank_account_copy_mime_type,
    status,
    matched_business_owner_id
  ) VALUES (
    NEW.id,
    lower(btrim(NEW.email)),
    btrim(NEW.raw_user_meta_data->>'business_name'),
    v_business_number,
    btrim(NEW.raw_user_meta_data->>'representative'),
    btrim(NEW.raw_user_meta_data->>'contact_name'),
    v_contact_phone,
    btrim(NEW.raw_user_meta_data->>'bank_name'),
    btrim(NEW.raw_user_meta_data->>'bank_holder'),
    v_bank_account,
    v_business_registration->>'storage_bucket',
    v_business_registration_path,
    NULLIF(v_business_registration->>'file_name', ''),
    CASE WHEN (v_business_registration->>'file_size') ~ '^[0-9]+$'
      THEN (v_business_registration->>'file_size')::bigint ELSE NULL END,
    NULLIF(v_business_registration->>'mime_type', ''),
    v_bank_account_document->>'storage_bucket',
    v_bank_account_path,
    NULLIF(v_bank_account_document->>'file_name', ''),
    CASE WHEN (v_bank_account_document->>'file_size') ~ '^[0-9]+$'
      THEN (v_bank_account_document->>'file_size')::bigint ELSE NULL END,
    NULLIF(v_bank_account_document->>'mime_type', ''),
    'pending',
    NEW.id
  );

  INSERT INTO public.business_owner_documents (
    business_owner_id,
    document_type,
    file_name,
    file_url,
    file_size,
    mime_type,
    storage_bucket,
    storage_path,
    sort_order
  ) VALUES
    (
      NEW.id,
      'business_registration',
      COALESCE(NULLIF(v_business_registration->>'file_name', ''), '사업자등록증'),
      v_business_registration_path,
      CASE WHEN (v_business_registration->>'file_size') ~ '^[0-9]+$'
        THEN (v_business_registration->>'file_size')::integer ELSE NULL END,
      NULLIF(v_business_registration->>'mime_type', ''),
      'business-signup-documents',
      v_business_registration_path,
      0
    ),
    (
      NEW.id,
      'bank_account',
      COALESCE(NULLIF(v_bank_account_document->>'file_name', ''), '통장사본'),
      v_bank_account_path,
      CASE WHEN (v_bank_account_document->>'file_size') ~ '^[0-9]+$'
        THEN (v_bank_account_document->>'file_size')::integer ELSE NULL END,
      NULLIF(v_bank_account_document->>'mime_type', ''),
      'business-signup-documents',
      v_bank_account_path,
      1
    );

  RETURN NEW;
END;
$$;
