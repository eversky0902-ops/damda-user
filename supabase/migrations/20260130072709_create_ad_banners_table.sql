-- 광고 배너 테이블 생성
CREATE TABLE ad_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  advertiser_name VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_ad_banners_is_visible ON ad_banners(is_visible);
CREATE INDEX idx_ad_banners_sort_order ON ad_banners(sort_order);
CREATE INDEX idx_ad_banners_dates ON ad_banners(start_date, end_date);

-- RLS 활성화
ALTER TABLE ad_banners ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 공개된 광고 배너 조회 가능
CREATE POLICY "Anyone can view visible ad banners" ON ad_banners
  FOR SELECT USING (is_visible = true);

-- 정책: 인증된 사용자(관리자)가 모든 작업 가능
CREATE POLICY "Authenticated users can manage ad banners" ON ad_banners
  FOR ALL USING (auth.role() = 'authenticated');

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_ad_banners_updated_at
  BEFORE UPDATE ON ad_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE ad_banners IS '메인 카테고리 하단 광고 배너 (외부 업체 광고)';
COMMENT ON COLUMN ad_banners.title IS '광고 제목';
COMMENT ON COLUMN ad_banners.advertiser_name IS '광고주명 (예: 도시락업체)';
COMMENT ON COLUMN ad_banners.image_url IS '배너 이미지 URL';
COMMENT ON COLUMN ad_banners.link_url IS '외부 링크 URL (outlink)';
COMMENT ON COLUMN ad_banners.sort_order IS '정렬 순서 (낮을수록 먼저 표시)';
COMMENT ON COLUMN ad_banners.start_date IS '게시 시작일';
COMMENT ON COLUMN ad_banners.end_date IS '게시 종료일';
COMMENT ON COLUMN ad_banners.is_visible IS '공개 여부';
