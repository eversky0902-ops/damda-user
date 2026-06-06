-- admins 테이블의 email 컬럼을 login_id로 변경
ALTER TABLE public.admins RENAME COLUMN email TO login_id;

-- 기존 데이터 삭제 (테스트 계정)
DELETE FROM public.admins WHERE login_id = 'admin@damda.com';
