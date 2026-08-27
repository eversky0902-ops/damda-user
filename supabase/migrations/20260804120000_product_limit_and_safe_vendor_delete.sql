-- Enforce the per-owner product limit and provide guarded vendor deletion.

CREATE OR REPLACE FUNCTION public.enforce_business_owner_product_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_product_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.business_owner_id::text, 0));

  SELECT count(*) INTO v_product_count
  FROM public.products
  WHERE business_owner_id = NEW.business_owner_id
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_product_count >= 10 THEN
    RAISE EXCEPTION 'PRODUCT_LIMIT_REACHED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_product_limit_per_business_owner ON public.products;
CREATE TRIGGER enforce_product_limit_per_business_owner
  BEFORE INSERT OR UPDATE OF business_owner_id ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_business_owner_product_limit();

CREATE OR REPLACE FUNCTION public.delete_business_owner_safely(
  p_business_owner_id uuid,
  p_confirmation_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner public.business_owners%ROWTYPE;
  v_product_count integer;
  v_reservation_count integer;
  v_settlement_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  SELECT * INTO v_owner
  FROM public.business_owners
  WHERE id = p_business_owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_OWNER_NOT_FOUND';
  END IF;
  IF btrim(COALESCE(p_confirmation_name, '')) <> v_owner.name THEN
    RAISE EXCEPTION 'CONFIRMATION_NAME_MISMATCH';
  END IF;

  SELECT count(*) INTO v_product_count FROM public.products
  WHERE business_owner_id = p_business_owner_id;
  SELECT count(*) INTO v_reservation_count FROM public.reservations
  WHERE business_owner_id = p_business_owner_id;
  SELECT count(*) INTO v_settlement_count FROM public.settlements
  WHERE business_owner_id = p_business_owner_id;

  IF v_product_count > 0 OR v_reservation_count > 0 OR v_settlement_count > 0 THEN
    RAISE EXCEPTION 'BUSINESS_OWNER_HAS_RELATED_DATA products=% reservations=% settlements=%',
      v_product_count, v_reservation_count, v_settlement_count;
  END IF;

  IF v_owner.auth_user_id IS NOT NULL THEN
    DELETE FROM public.user_roles
    WHERE id = v_owner.auth_user_id AND role = 'business_owner';
  END IF;

  DELETE FROM public.business_owners WHERE id = p_business_owner_id;

  RETURN jsonb_build_object(
    'success', true,
    'business_owner_id', p_business_owner_id,
    'name', v_owner.name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_business_owner_safely(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_business_owner_safely(uuid, text) TO authenticated;
