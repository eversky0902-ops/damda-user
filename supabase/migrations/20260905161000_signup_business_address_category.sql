-- 회원가입에서 받은 위치/카테고리를 가입 신청, 사업주 기본 정보, 기본 사업장에 동기화한다.
ALTER TABLE public.business_owner_signup_requests
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS address_detail text,
  ADD COLUMN IF NOT EXISTS zipcode text,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS business_owner_signup_requests_category_id_idx
  ON public.business_owner_signup_requests(category_id);

CREATE OR REPLACE FUNCTION public.attach_signup_business_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address text;
  v_address_detail text;
  v_zipcode text;
  v_category_text text;
  v_category_id uuid;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', '') <> 'business_owner_signup' THEN
    RETURN NEW;
  END IF;

  v_address := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'address', '')), '');
  v_address_detail := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'address_detail', '')), '');
  v_zipcode := NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'zipcode', ''), '[^0-9]', '', 'g'), '');
  v_category_text := btrim(COALESCE(NEW.raw_user_meta_data->>'category_id', ''));

  -- 구버전 클라이언트나 관리자 생성 계정은 새 메타데이터가 없을 수 있다.
  -- 계정 생성을 막지 않고, 두 값이 모두 유효한 신규 회원가입만 사업장에 동기화한다.
  IF v_address IS NULL
    OR v_category_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    RETURN NEW;
  END IF;

  v_category_id := v_category_text::uuid;
  IF NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = v_category_id AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  UPDATE public.business_owner_signup_requests
  SET address = v_address,
      address_detail = v_address_detail,
      zipcode = v_zipcode,
      category_id = v_category_id,
      updated_at = now()
  WHERE auth_user_id = NEW.id;

  UPDATE public.business_owners
  SET address = v_address,
      address_detail = v_address_detail,
      zipcode = v_zipcode,
      updated_at = now()
  WHERE auth_user_id = NEW.id;

  UPDATE public.businesses
  SET address = v_address,
      address_detail = v_address_detail,
      zipcode = v_zipcode,
      category_id = v_category_id,
      updated_at = now()
  WHERE business_owner_id = NEW.id
    AND is_primary = true;

  RETURN NEW;
END;
$$;

-- PostgreSQL은 같은 이벤트의 트리거를 이름순으로 실행한다. 기존 자동 계정/사업장 생성 이후 실행한다.
DROP TRIGGER IF EXISTS zz_attach_signup_business_details ON auth.users;
CREATE TRIGGER zz_attach_signup_business_details
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.attach_signup_business_details();

COMMENT ON COLUMN public.business_owner_signup_requests.address IS '회원가입 시 입력한 기본 사업장 주소';
COMMENT ON COLUMN public.business_owner_signup_requests.category_id IS '회원가입 시 선택한 기본 사업장 카테고리';
