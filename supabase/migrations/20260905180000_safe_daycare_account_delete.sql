-- Safely remove a daycare/member account while preserving reservation and payment history.

ALTER TABLE public.daycares
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.admins(id) ON DELETE SET NULL;

ALTER TABLE public.daycares DROP CONSTRAINT IF EXISTS daycares_status_check;
ALTER TABLE public.daycares
  ADD CONSTRAINT daycares_status_check
  CHECK (status IN ('pending', 'requested', 'approved', 'rejected', 'revision_required', 'deleted'));

DROP INDEX IF EXISTS public.daycares_email_unique;
CREATE UNIQUE INDEX IF NOT EXISTS daycares_active_email_unique
  ON public.daycares(email)
  WHERE deleted_at IS NULL;

-- A deleted user's existing JWT may remain valid briefly. Restrict self-service profile
-- access to active account rows even after the Auth identity and role are removed.
DROP POLICY IF EXISTS "Daycares can view own profile" ON public.daycares;
DROP POLICY IF EXISTS "Users can view own daycare profile" ON public.daycares;
DROP POLICY IF EXISTS "Daycares can update own profile" ON public.daycares;
DROP POLICY IF EXISTS "Users can update own daycare profile" ON public.daycares;

CREATE POLICY "Active daycares view own profile"
  ON public.daycares FOR SELECT TO authenticated
  USING (id = auth.uid() AND status <> 'deleted' AND public.is_daycare());

CREATE POLICY "Active daycares update own profile"
  ON public.daycares FOR UPDATE TO authenticated
  USING (id = auth.uid() AND status <> 'deleted' AND public.is_daycare())
  WITH CHECK (id = auth.uid() AND status <> 'deleted' AND public.is_daycare());

CREATE OR REPLACE FUNCTION public.delete_daycare_safely(
  p_daycare_id uuid,
  p_confirmation_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_daycare public.daycares%ROWTYPE;
  v_admin_id uuid := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = v_admin_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  SELECT * INTO v_daycare
  FROM public.daycares
  WHERE id = p_daycare_id
  FOR UPDATE;

  IF NOT FOUND OR v_daycare.status = 'deleted' THEN
    RAISE EXCEPTION 'DAYCARE_NOT_FOUND';
  END IF;

  IF btrim(coalesce(p_confirmation_name, '')) <> v_daycare.name THEN
    RAISE EXCEPTION 'CONFIRMATION_NAME_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_owners
    WHERE auth_user_id = p_daycare_id
  ) THEN
    RAISE EXCEPTION 'SHARED_AUTH_ACCOUNT';
  END IF;

  UPDATE public.daycares
  SET status = 'deleted',
      deleted_at = now(),
      deleted_by = v_admin_id,
      updated_at = now()
  WHERE id = p_daycare_id;

  -- Removing the role blocks all role-gated APIs immediately. Removing the Auth user
  -- prevents future sign-in, while the daycare row remains as a historical reference.
  DELETE FROM public.user_roles WHERE id = p_daycare_id;
  DELETE FROM auth.users WHERE id = p_daycare_id;

  INSERT INTO public.admin_logs (
    admin_id,
    action,
    target_type,
    target_id,
    before_data
  ) VALUES (
    v_admin_id,
    'delete',
    'daycare',
    p_daycare_id,
    jsonb_build_object(
      'name', v_daycare.name,
      'email', v_daycare.email,
      'previous_status', v_daycare.status,
      'deletion_mode', 'soft_delete_with_auth_removal'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'daycare_id', p_daycare_id,
    'name', v_daycare.name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_daycare_safely(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_daycare_safely(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.delete_daycare_safely(uuid, text)
  IS 'Admin-only member deletion: revokes login and hides the member while preserving transaction history.';
