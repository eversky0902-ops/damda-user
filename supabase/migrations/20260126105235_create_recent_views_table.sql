-- 최근 본 상품 테이블
CREATE TABLE recent_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(daycare_id, product_id)
);

-- 인덱스
CREATE INDEX idx_recent_views_daycare_id ON recent_views(daycare_id);
CREATE INDEX idx_recent_views_viewed_at ON recent_views(viewed_at DESC);

-- RLS 활성화
ALTER TABLE recent_views ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인만 조회/수정 가능
CREATE POLICY "Users can view own recent views" ON recent_views
  FOR SELECT USING (daycare_id = auth.uid());

CREATE POLICY "Users can insert own recent views" ON recent_views
  FOR INSERT WITH CHECK (daycare_id = auth.uid());

CREATE POLICY "Users can update own recent views" ON recent_views
  FOR UPDATE USING (daycare_id = auth.uid());

CREATE POLICY "Users can delete own recent views" ON recent_views
  FOR DELETE USING (daycare_id = auth.uid());

-- 테이블 코멘트
COMMENT ON TABLE recent_views IS '최근 본 상품';
