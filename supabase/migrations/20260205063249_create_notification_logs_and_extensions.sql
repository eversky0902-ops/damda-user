-- 알림톡 발송 로그 테이블
CREATE TABLE notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type varchar NOT NULL,
  template_code varchar NOT NULL,
  recipient_type varchar NOT NULL CHECK (recipient_type IN ('daycare', 'business_owner')),
  recipient_id uuid,
  recipient_phone varchar NOT NULL,
  message_content text,
  variables jsonb,
  status varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  aligo_response jsonb,
  reference_type varchar,
  reference_id uuid,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

COMMENT ON TABLE notification_logs IS '알림톡 발송 로그';
COMMENT ON COLUMN notification_logs.notification_type IS '알림 유형 (reservation_completed, new_reservation, etc.)';
COMMENT ON COLUMN notification_logs.template_code IS '알리고 템플릿 코드 (UF_xxxx)';
COMMENT ON COLUMN notification_logs.recipient_type IS '수신자 유형 (daycare, business_owner)';
COMMENT ON COLUMN notification_logs.reference_type IS '참조 테이블 (reservation, daycare)';
COMMENT ON COLUMN notification_logs.reference_id IS '참조 레코드 ID';

CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX idx_notification_logs_reference ON notification_logs(reference_type, reference_id);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at DESC);

-- pg_net: 트리거에서 Edge Function HTTP 호출용
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- pg_cron: 스케줄 알림 (D-1 리마인더, 리뷰 요청)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
