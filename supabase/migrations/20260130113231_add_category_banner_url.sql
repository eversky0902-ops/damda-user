-- 카테고리 배너 이미지 URL 컬럼 추가
ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_url TEXT;
