BEGIN;

DO $$
DECLARE
  v_admin_id uuid;
  v_daycare_id uuid := '33333333-3333-4333-8333-333333333333';
  v_status text;
  v_deleted_at timestamptz;
BEGIN
  SELECT id INTO v_admin_id FROM public.admins WHERE is_active = true LIMIT 1;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'active admin fixture is required';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  INSERT INTO public.daycares (
    id, email, name, contact_name, contact_phone,
    license_number, license_file, address, status
  ) VALUES (
    v_daycare_id, 'safe-delete-smoke@withdamda.invalid', '삭제 테스트 회원',
    '테스트 담당자', '01000000000', 'SMOKE-DELETE', '', '테스트 주소', 'pending'
  );

  BEGIN
    PERFORM public.delete_daycare_safely(v_daycare_id, '잘못된 회원명');
    RAISE EXCEPTION 'incorrect confirmation name was accepted';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%CONFIRMATION_NAME_MISMATCH%' THEN
        RAISE;
      END IF;
  END;

  PERFORM public.delete_daycare_safely(v_daycare_id, '삭제 테스트 회원');

  SELECT status, deleted_at INTO v_status, v_deleted_at
  FROM public.daycares WHERE id = v_daycare_id;

  IF v_status <> 'deleted' OR v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'member was not soft-deleted correctly';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE id = v_daycare_id) THEN
    RAISE EXCEPTION 'deleted member role remains';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_logs
    WHERE target_type = 'daycare'
      AND target_id = v_daycare_id
      AND action = 'delete'
  ) THEN
    RAISE EXCEPTION 'member deletion audit log is missing';
  END IF;
END;
$$;

ROLLBACK;
