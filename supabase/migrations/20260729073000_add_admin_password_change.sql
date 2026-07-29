CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.change_admin_password(
  p_current_password text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin public.admins%ROWTYPE;
  v_current_hash text;
  v_new_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT *
  INTO v_admin
  FROM public.admins
  WHERE id = auth.uid()
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADMIN_NOT_FOUND';
  END IF;

  v_current_hash := encode(
    extensions.digest(p_current_password || 'damda-salt-2024', 'sha256'),
    'hex'
  );

  IF v_current_hash <> v_admin.password_hash THEN
    RAISE EXCEPTION 'CURRENT_PASSWORD_INVALID';
  END IF;

  IF p_new_password = p_current_password THEN
    RAISE EXCEPTION 'PASSWORD_REUSE_NOT_ALLOWED';
  END IF;

  IF length(p_new_password) < 8
    OR p_new_password !~ '[A-Za-z]'
    OR p_new_password !~ '[0-9]'
    OR p_new_password !~ '[^A-Za-z0-9]'
  THEN
    RAISE EXCEPTION 'PASSWORD_POLICY_VIOLATION';
  END IF;

  v_new_hash := encode(
    extensions.digest(p_new_password || 'damda-salt-2024', 'sha256'),
    'hex'
  );

  UPDATE public.admins
  SET password_hash = v_new_hash,
      updated_at = now()
  WHERE id = v_admin.id;

  INSERT INTO public.admin_logs (
    admin_id,
    action,
    target_type,
    target_id,
    before_data,
    after_data
  ) VALUES (
    v_admin.id,
    'update',
    'admin',
    v_admin.id,
    jsonb_build_object('password_changed', false),
    jsonb_build_object('password_changed', true)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.change_admin_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_admin_password(text, text) TO authenticated;

COMMENT ON FUNCTION public.change_admin_password(text, text)
IS '현재 로그인한 관리자의 비밀번호를 확인한 뒤 새 비밀번호 해시로 변경합니다.';
