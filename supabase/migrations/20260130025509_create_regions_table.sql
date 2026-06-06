-- 지역 테이블 (검색 UI용)
CREATE TABLE regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES regions(id) ON DELETE CASCADE,
  name varchar(50) NOT NULL,
  full_name varchar(100) NOT NULL,
  depth integer NOT NULL CHECK (depth >= 1 AND depth <= 2),
  sort_order integer NOT NULL DEFAULT 0,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE regions IS '지역 (검색 UI용)';
COMMENT ON COLUMN regions.parent_id IS '상위 지역 (시/도는 null)';
COMMENT ON COLUMN regions.name IS '지역명 (서울, 강남구)';
COMMENT ON COLUMN regions.full_name IS '전체 지역명 (서울 강남구)';
COMMENT ON COLUMN regions.depth IS '1: 시/도, 2: 구/군';
COMMENT ON COLUMN regions.is_popular IS '인기 지역 여부';

-- 인덱스
CREATE INDEX idx_regions_parent_id ON regions(parent_id);
CREATE INDEX idx_regions_depth ON regions(depth);
CREATE INDEX idx_regions_is_active ON regions(is_active);
CREATE INDEX idx_regions_is_popular ON regions(is_popular);

-- RLS 활성화
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 허용
CREATE POLICY "regions_select_policy" ON regions
  FOR SELECT USING (true);
