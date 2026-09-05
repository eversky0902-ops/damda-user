-- Keep self-service profile edits, but prevent members from promoting
-- themselves or changing settlement-related fields through direct REST calls.

CREATE OR REPLACE FUNCTION public.guard_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_active_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'daycares' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
      OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
      OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
      OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION '관리자만 기관 승인 정보와 이메일을 변경할 수 있습니다.';
    END IF;
  ELSIF TG_TABLE_NAME = 'business_owners' THEN
    IF NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.business_number IS DISTINCT FROM OLD.business_number
      OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION '관리자만 사업주 권한 및 정산 정보를 변경할 수 있습니다.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_daycare_privilege_fields ON public.daycares;
CREATE TRIGGER guard_daycare_privilege_fields
  BEFORE UPDATE ON public.daycares
  FOR EACH ROW EXECUTE FUNCTION public.guard_sensitive_profile_fields();

DROP TRIGGER IF EXISTS guard_business_owner_privilege_fields ON public.business_owners;
CREATE TRIGGER guard_business_owner_privilege_fields
  BEFORE UPDATE ON public.business_owners
  FOR EACH ROW EXECUTE FUNCTION public.guard_sensitive_profile_fields();
