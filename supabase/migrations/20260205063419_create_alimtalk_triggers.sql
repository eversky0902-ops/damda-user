-- 예약 이벤트 트리거 함수
CREATE OR REPLACE FUNCTION notify_reservation_event()
RETURNS TRIGGER AS $$
BEGIN
  -- 예약 결제 완료 (INSERT with paid OR UPDATE to paid)
  IF (TG_OP = 'INSERT' AND NEW.status = 'paid')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'paid' AND NEW.status = 'paid') THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'reservation_paid', 'reservation_id', NEW.id)
    );
  END IF;

  -- 예약 취소
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled' THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'reservation_cancelled', 'reservation_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 어린이집(회원) 이벤트 트리거 함수
CREATE OR REPLACE FUNCTION notify_daycare_event()
RETURNS TRIGGER AS $$
BEGIN
  -- 가입 승인
  IF OLD.status IS DISTINCT FROM 'approved' AND NEW.status = 'approved' THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'daycare_approved', 'daycare_id', NEW.id)
    );
  END IF;

  -- 가입 반려
  IF OLD.status IS DISTINCT FROM 'rejected' AND NEW.status = 'rejected' THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'daycare_rejected', 'daycare_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
CREATE TRIGGER tr_reservation_alimtalk
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION notify_reservation_event();

CREATE TRIGGER tr_daycare_alimtalk
  AFTER UPDATE ON daycares
  FOR EACH ROW
  EXECUTE FUNCTION notify_daycare_event();
