-- business_owners 테이블 id에 기본값 추가 (자동 생성)
ALTER TABLE public.business_owners 
ALTER COLUMN id SET DEFAULT gen_random_uuid();
