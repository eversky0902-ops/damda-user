-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "Daycares can insert own profile" ON daycares;

-- 새 정책: 인증된 사용자는 자신의 ID로 insert 가능 (이메일 확인 전에도)
CREATE POLICY "Daycares can insert own profile" ON daycares
FOR INSERT 
TO authenticated
WITH CHECK (id = auth.uid());

-- anon 사용자도 insert 허용 (signUp 직후 세션이 없을 경우 대비)
CREATE POLICY "Allow signup insert" ON daycares
FOR INSERT
TO anon
WITH CHECK (true);
