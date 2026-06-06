-- 회원가입 시 자동으로 이메일 인증 처리하는 트리거
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 사용자의 email_confirmed_at을 현재 시간으로 설정
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있으면 삭제
DROP TRIGGER IF EXISTS on_auth_user_created_confirm_email ON auth.users;

-- auth.users 테이블에 트리거 생성
CREATE TRIGGER on_auth_user_created_confirm_email
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email();
