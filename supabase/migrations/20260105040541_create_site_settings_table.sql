-- 사이트 설정 테이블 (key-value 형태로 유연하게 설정 저장)
CREATE TABLE site_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES admins(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE site_settings IS '사이트 설정';

-- 기본 설정값 삽입
INSERT INTO site_settings (key, value, description) VALUES
  ('default_commission_rate', '10', '기본 수수료율 (%)'),
  ('commission_rate_min', '5', '최소 수수료율 (%)'),
  ('commission_rate_max', '15', '최대 수수료율 (%)'),
  ('settlement_cycle', '"monthly"', '정산 주기 (weekly/monthly)'),
  ('reservation_advance_days', '30', '예약 가능 기간 (일)'),
  ('cancellation_policy', '{"d3": 100, "d2": 70, "d1": 50, "d0": 0}', '취소 정책 (D-n: 환불율%)'),
  ('min_reservation_notice', '1', '최소 예약 사전 알림 (일)'),
  ('service_email', '"contact@damda.co.kr"', '서비스 이메일'),
  ('service_phone', '"02-1234-5678"', '서비스 전화번호'),
  ('business_hours', '{"start": "09:00", "end": "18:00"}', '운영 시간');

-- RLS 활성화
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 관리자만 읽기/쓰기 가능
CREATE POLICY "Admins can read site_settings" ON site_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update site_settings" ON site_settings
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can insert site_settings" ON site_settings
  FOR INSERT TO authenticated WITH CHECK (true);
