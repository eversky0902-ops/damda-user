-- Partner onboarding workflow: contract-first review and atomic owner/product creation.

CREATE TABLE IF NOT EXISTS public.sales_agents (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales agents view own profile" ON public.sales_agents
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins manage sales agents" ON public.sales_agents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.partner_onboardings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'contract_pending', 'contract_in_progress',
    'under_review', 'revision_requested', 'ready_for_approval',
    'approving', 'approved', 'rejected', 'failed'
  )),
  contract_status text NOT NULL DEFAULT 'not_sent' CHECK (contract_status IN (
    'not_sent', 'send_requested', 'sent', 'viewed', 'signed',
    'completed', 'declined', 'expired', 'failed'
  )),
  contract_external_id text,
  contract_sent_at timestamptz,
  contract_completed_at timestamptz,
  signup_request_id uuid REFERENCES public.business_owner_signup_requests(id) ON DELETE SET NULL,
  business_owner_id uuid REFERENCES public.business_owners(id) ON DELETE SET NULL,
  owner_code varchar(20) NOT NULL DEFAULT ('DAMDA-' || lpad(nextval('public.business_owner_code_seq')::text, 6, '0')),
  business_name text NOT NULL,
  business_number text NOT NULL,
  representative text NOT NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  address_detail text,
  zipcode text,
  bank_name text,
  bank_account text,
  bank_holder text,
  tax_email text,
  commission_rate numeric(5,2) NOT NULL DEFAULT 10 CHECK (commission_rate BETWEEN 5 AND 15),
  sales_manager_name text,
  review_note text,
  revision_note text,
  created_by uuid REFERENCES public.admins(id) ON DELETE SET NULL,
  sales_agent_id uuid REFERENCES public.sales_agents(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.admins(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_onboardings_business_number_digits CHECK (business_number ~ '^[0-9]{10}$')
);

CREATE INDEX IF NOT EXISTS partner_onboardings_status_idx
  ON public.partner_onboardings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS partner_onboardings_business_number_idx
  ON public.partner_onboardings(business_number);
CREATE UNIQUE INDEX IF NOT EXISTS partner_onboardings_active_business_number_unique
  ON public.partner_onboardings(business_number)
  WHERE status NOT IN ('rejected', 'approved');
CREATE UNIQUE INDEX IF NOT EXISTS partner_onboardings_owner_code_unique
  ON public.partner_onboardings(owner_code);
CREATE INDEX IF NOT EXISTS partner_onboardings_sales_agent_idx
  ON public.partner_onboardings(sales_agent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.partner_onboarding_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid NOT NULL REFERENCES public.partner_onboardings(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('business_registration', 'bank_account')),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (onboarding_id, document_type)
);

ALTER TABLE public.business_owner_documents
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text;

CREATE TABLE IF NOT EXISTS public.partner_onboarding_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid NOT NULL REFERENCES public.partner_onboardings(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  summary text,
  description text,
  thumbnail text NOT NULL,
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  original_price integer NOT NULL CHECK (original_price >= 0),
  sale_price integer NOT NULL CHECK (sale_price >= 0),
  min_participants integer NOT NULL DEFAULT 1 CHECK (min_participants > 0),
  max_participants integer NOT NULL CHECK (max_participants > 0),
  duration_minutes integer,
  address text,
  address_detail text,
  region text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sale_price <= original_price),
  CHECK (max_participants >= min_participants)
);

CREATE INDEX IF NOT EXISTS partner_onboarding_products_onboarding_idx
  ON public.partner_onboarding_products(onboarding_id, sort_order);

CREATE TABLE IF NOT EXISTS public.partner_onboarding_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid NOT NULL REFERENCES public.partner_onboardings(id) ON DELETE CASCADE,
  action text NOT NULL,
  note text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_onboarding_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_onboarding_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner onboardings" ON public.partner_onboardings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()));
CREATE POLICY "Sales agents manage own partner onboardings" ON public.partner_onboardings
  FOR ALL TO authenticated
  USING (
    sales_agent_id = auth.uid()
    AND status NOT IN ('approving', 'approved', 'rejected')
    AND EXISTS (SELECT 1 FROM public.sales_agents s WHERE s.id = auth.uid() AND s.is_active)
  )
  WITH CHECK (
    sales_agent_id = auth.uid()
    AND status NOT IN ('approving', 'approved', 'rejected')
    AND EXISTS (SELECT 1 FROM public.sales_agents s WHERE s.id = auth.uid() AND s.is_active)
  );
CREATE POLICY "Sales agents view own completed onboardings" ON public.partner_onboardings
  FOR SELECT TO authenticated
  USING (
    sales_agent_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.sales_agents s WHERE s.id = auth.uid() AND s.is_active)
  );
CREATE POLICY "Sales agents view matching business signup requests"
  ON public.business_owner_signup_requests
  FOR SELECT TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.partner_onboardings o
      WHERE o.sales_agent_id = auth.uid()
        AND o.business_number = business_owner_signup_requests.business_number
        AND o.owner_code = business_owner_signup_requests.owner_code
    )
  );
CREATE POLICY "Admins manage partner onboarding documents" ON public.partner_onboarding_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()));
CREATE POLICY "Sales agents manage own onboarding documents" ON public.partner_onboarding_documents
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_onboardings o
    WHERE o.id = onboarding_id AND o.sales_agent_id = auth.uid()
      AND o.status NOT IN ('approving', 'approved', 'rejected')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.partner_onboardings o
    WHERE o.id = onboarding_id AND o.sales_agent_id = auth.uid()
      AND o.status NOT IN ('approving', 'approved', 'rejected')
  ));
CREATE POLICY "Sales agents view own onboarding documents" ON public.partner_onboarding_documents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_onboardings o
    WHERE o.id = onboarding_id AND o.sales_agent_id = auth.uid()
  ));
CREATE POLICY "Admins manage partner onboarding products" ON public.partner_onboarding_products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()));
CREATE POLICY "Sales agents manage own onboarding products" ON public.partner_onboarding_products
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_onboardings o
    WHERE o.id = onboarding_id AND o.sales_agent_id = auth.uid()
      AND o.status NOT IN ('approving', 'approved', 'rejected')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.partner_onboardings o
    WHERE o.id = onboarding_id AND o.sales_agent_id = auth.uid()
      AND o.status NOT IN ('approving', 'approved', 'rejected')
  ));
CREATE POLICY "Sales agents view own onboarding products" ON public.partner_onboarding_products
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_onboardings o
    WHERE o.id = onboarding_id AND o.sales_agent_id = auth.uid()
  ));
CREATE POLICY "Admins view partner onboarding history" ON public.partner_onboarding_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()));
CREATE POLICY "Admins add partner onboarding history" ON public.partner_onboarding_history
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()));
CREATE POLICY "Sales agents view own onboarding history" ON public.partner_onboarding_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_onboardings o
    WHERE o.id = onboarding_id AND o.sales_agent_id = auth.uid()
  ));
CREATE POLICY "Sales agents add own onboarding history" ON public.partner_onboarding_history
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.partner_onboardings o
    WHERE o.id = onboarding_id AND o.sales_agent_id = auth.uid()
  ));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-onboarding-documents',
  'partner-onboarding-documents',
  false,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins manage partner onboarding files" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'partner-onboarding-documents'
    AND EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'partner-onboarding-documents'
    AND EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid())
  );
CREATE POLICY "Sales agents view own partner onboarding files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'partner-onboarding-documents'
    AND EXISTS (
      SELECT 1 FROM public.partner_onboardings o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.sales_agent_id = auth.uid()
    )
  );
CREATE POLICY "Sales agents upload own partner onboarding files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partner-onboarding-documents'
    AND EXISTS (
      SELECT 1 FROM public.partner_onboardings o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.sales_agent_id = auth.uid()
        AND o.status NOT IN ('approving', 'approved', 'rejected')
    )
  );
CREATE POLICY "Sales agents update own partner onboarding files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'partner-onboarding-documents'
    AND EXISTS (
      SELECT 1 FROM public.partner_onboardings o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.sales_agent_id = auth.uid()
        AND o.status NOT IN ('approving', 'approved', 'rejected')
    )
  )
  WITH CHECK (
    bucket_id = 'partner-onboarding-documents'
    AND EXISTS (
      SELECT 1 FROM public.partner_onboardings o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.sales_agent_id = auth.uid()
        AND o.status NOT IN ('approving', 'approved', 'rejected')
    )
  );
CREATE POLICY "Sales agents delete own partner onboarding files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'partner-onboarding-documents'
    AND EXISTS (
      SELECT 1 FROM public.partner_onboardings o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.sales_agent_id = auth.uid()
        AND o.status NOT IN ('approving', 'approved', 'rejected')
    )
  );

CREATE OR REPLACE FUNCTION public.log_partner_onboarding_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.partner_onboarding_history (onboarding_id, action, actor_id)
    VALUES (NEW.id, 'created', auth.uid());
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.partner_onboarding_history (onboarding_id, action, note, actor_id)
    VALUES (NEW.id, 'status_changed', OLD.status || ' -> ' || NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partner_onboarding_change_log ON public.partner_onboardings;
CREATE TRIGGER partner_onboarding_change_log
  AFTER INSERT OR UPDATE ON public.partner_onboardings
  FOR EACH ROW EXECUTE FUNCTION public.log_partner_onboarding_change();

CREATE OR REPLACE FUNCTION public.approve_partner_onboarding(p_onboarding_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_onboarding public.partner_onboardings%ROWTYPE;
  v_signup public.business_owner_signup_requests%ROWTYPE;
  v_owner_id uuid := gen_random_uuid();
  v_product record;
  v_product_id uuid;
  v_image text;
  v_option jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()) THEN
    RAISE EXCEPTION '관리자만 입점을 승인할 수 있습니다.';
  END IF;

  SELECT * INTO v_onboarding
  FROM public.partner_onboardings
  WHERE id = p_onboarding_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION '입점 신청을 찾을 수 없습니다.'; END IF;
  IF v_onboarding.status = 'approved' THEN
    RETURN jsonb_build_object('success', true, 'business_owner_id', v_onboarding.business_owner_id);
  END IF;
  IF v_onboarding.status <> 'ready_for_approval' THEN RAISE EXCEPTION '승인 대기 상태가 아닙니다.'; END IF;
  IF v_onboarding.contract_status <> 'completed' THEN RAISE EXCEPTION '계약이 완료되지 않았습니다.'; END IF;
  IF v_onboarding.signup_request_id IS NULL THEN RAISE EXCEPTION '사업주 콘솔 가입 계정이 연결되지 않았습니다.'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_onboarding_documents
    WHERE onboarding_id = p_onboarding_id AND document_type = 'business_registration'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.partner_onboarding_documents
    WHERE onboarding_id = p_onboarding_id AND document_type = 'bank_account'
  ) THEN RAISE EXCEPTION '필수 서류가 누락되었습니다.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partner_onboarding_products WHERE onboarding_id = p_onboarding_id) THEN
    RAISE EXCEPTION '등록할 상품이 없습니다.';
  END IF;
  IF (SELECT count(*) FROM public.partner_onboarding_products WHERE onboarding_id = p_onboarding_id) > 10 THEN
    RAISE EXCEPTION '사업주별 상품은 최대 10개까지 등록할 수 있습니다.';
  END IF;

  SELECT * INTO v_signup
  FROM public.business_owner_signup_requests
  WHERE id = v_onboarding.signup_request_id
  FOR UPDATE;

  IF NOT FOUND OR v_signup.status <> 'pending' THEN RAISE EXCEPTION '유효한 가입 신청이 아닙니다.'; END IF;
  IF regexp_replace(v_signup.business_number, '[^0-9]', '', 'g') <> v_onboarding.business_number THEN
    RAISE EXCEPTION '가입 신청과 입점 신청의 사업자번호가 일치하지 않습니다.';
  END IF;
  IF upper(btrim(v_signup.owner_code)) <> v_onboarding.owner_code THEN
    RAISE EXCEPTION '가입 신청과 입점 신청의 사업주 코드가 일치하지 않습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.business_owners WHERE business_number = v_onboarding.business_number) THEN
    RAISE EXCEPTION '이미 등록된 사업자번호입니다.';
  END IF;

  UPDATE public.partner_onboardings SET status = 'approving', updated_at = now()
  WHERE id = p_onboarding_id;

  INSERT INTO public.business_owners (
    id, auth_user_id, owner_code, email, name, business_number, representative,
    contact_name, contact_phone, address, address_detail, zipcode,
    bank_name, bank_account, bank_holder, tax_email, commission_rate, status
  ) VALUES (
    v_owner_id, v_signup.auth_user_id, v_onboarding.owner_code, v_signup.email, v_onboarding.business_name,
    v_onboarding.business_number, v_onboarding.representative, v_onboarding.contact_name,
    v_onboarding.contact_phone, v_onboarding.address, v_onboarding.address_detail,
    v_onboarding.zipcode, v_onboarding.bank_name, v_onboarding.bank_account,
    v_onboarding.bank_holder, v_onboarding.tax_email, v_onboarding.commission_rate, 'active'
  );

  INSERT INTO public.business_owner_documents (
    business_owner_id, document_type, file_name, file_url, file_size, mime_type,
    storage_bucket, storage_path, sort_order
  )
  SELECT v_owner_id, document_type, file_name, storage_path, file_size, mime_type,
         'partner-onboarding-documents', storage_path,
         CASE WHEN document_type = 'business_registration' THEN 0 ELSE 1 END
  FROM public.partner_onboarding_documents WHERE onboarding_id = p_onboarding_id;

  FOR v_product IN
    SELECT * FROM public.partner_onboarding_products
    WHERE onboarding_id = p_onboarding_id ORDER BY sort_order, created_at
  LOOP
    INSERT INTO public.products (
      business_owner_id, category_id, name, summary, description, thumbnail,
      original_price, sale_price, min_participants, max_participants,
      duration_minutes, address, address_detail, region, is_visible
    ) VALUES (
      v_owner_id, v_product.category_id, v_product.name, v_product.summary,
      v_product.description, v_product.thumbnail, v_product.original_price,
      v_product.sale_price, v_product.min_participants, v_product.max_participants,
      v_product.duration_minutes, v_product.address, v_product.address_detail,
      v_product.region, false
    ) RETURNING id INTO v_product_id;

    FOR v_image IN SELECT jsonb_array_elements_text(v_product.image_urls)
    LOOP
      INSERT INTO public.product_images (product_id, image_url, sort_order)
      VALUES (v_product_id, v_image, 0);
    END LOOP;
    FOR v_option IN SELECT value FROM jsonb_array_elements(v_product.options)
    LOOP
      INSERT INTO public.product_options (product_id, name, price, is_required, sort_order)
      VALUES (
        v_product_id,
        v_option->>'name',
        COALESCE((v_option->>'price')::integer, 0),
        COALESCE((v_option->>'is_required')::boolean, false),
        COALESCE((v_option->>'sort_order')::integer, 0)
      );
    END LOOP;
  END LOOP;

  INSERT INTO public.user_roles (id, role) VALUES (v_signup.auth_user_id, 'business_owner')
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.business_owner_signup_requests
  SET status = 'approved', matched_business_owner_id = v_owner_id,
      reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = v_signup.id;

  UPDATE public.partner_onboardings
  SET status = 'approved', business_owner_id = v_owner_id,
      approved_by = auth.uid(), approved_at = now(), updated_at = now()
  WHERE id = p_onboarding_id;

  RETURN jsonb_build_object('success', true, 'business_owner_id', v_owner_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_partner_onboarding(uuid) TO authenticated;
