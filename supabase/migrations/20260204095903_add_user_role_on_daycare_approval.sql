-- 어린이집 승인 시 자동으로 user_roles에 daycare 역할 추가하는 트리거
CREATE OR REPLACE FUNCTION add_daycare_role_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- status가 approved로 변경되었을 때만 실행
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- auth.users에 존재하는 경우에만 user_roles에 추가
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
      INSERT INTO user_roles (id, role)
      VALUES (NEW.id, 'daycare')
      ON CONFLICT (id) DO UPDATE SET role = 'daycare';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있으면 삭제
DROP TRIGGER IF EXISTS on_daycare_approval ON daycares;

-- 트리거 생성 (INSERT와 UPDATE 모두에 대응)
CREATE TRIGGER on_daycare_approval
  AFTER INSERT OR UPDATE OF status ON daycares
  FOR EACH ROW
  EXECUTE FUNCTION add_daycare_role_on_approval();

COMMENT ON FUNCTION add_daycare_role_on_approval() IS '어린이집 승인 시 user_roles에 daycare 역할 자동 추가';
