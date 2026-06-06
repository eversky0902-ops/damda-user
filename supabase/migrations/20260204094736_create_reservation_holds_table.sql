-- 결제 홀드 테이블 생성 - 동시 결제 방지를 위한 10분간 예약 잠금
CREATE TABLE IF NOT EXISTS reservation_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reserved_date DATE NOT NULL,
  daycare_id UUID NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),

  -- 동시 결제 방지: 같은 상품 + 같은 날짜에 하나의 홀드만 가능
  CONSTRAINT unique_product_date_hold UNIQUE (product_id, reserved_date)
);

-- 인덱스 생성
CREATE INDEX idx_reservation_holds_expires_at ON reservation_holds(expires_at);
CREATE INDEX idx_reservation_holds_daycare_id ON reservation_holds(daycare_id);

-- RLS 활성화
ALTER TABLE reservation_holds ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Users can view own holds" ON reservation_holds FOR SELECT USING (auth.uid() = daycare_id);
CREATE POLICY "Users can create holds" ON reservation_holds FOR INSERT WITH CHECK (auth.uid() = daycare_id);
CREATE POLICY "Users can delete own holds" ON reservation_holds FOR DELETE USING (auth.uid() = daycare_id);

-- 만료된 홀드 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_holds() RETURNS void AS $$
BEGIN 
  DELETE FROM reservation_holds WHERE expires_at < now(); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 테이블 코멘트
COMMENT ON TABLE reservation_holds IS '결제 홀드 - 동시 결제 방지를 위한 10분간 예약 잠금';
