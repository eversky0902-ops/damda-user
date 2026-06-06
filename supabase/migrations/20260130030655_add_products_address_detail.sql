-- products 테이블에 상세주소 컬럼 추가
ALTER TABLE public.products 
ADD COLUMN address_detail character varying(500) NULL;
