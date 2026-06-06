CREATE OR REPLACE FUNCTION notify_reservation_event()
RETURNS TRIGGER AS $$
BEGIN
  -- 예약 결제 완료 (paid 또는 confirmed로 생성/변경 시)
  IF (TG_OP = 'INSERT' AND NEW.status IN ('paid', 'confirmed'))
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'paid' AND NEW.status = 'paid')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'confirmed' AND NEW.status = 'confirmed' AND OLD.status NOT IN ('paid')) THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'reservation_paid', 'reservation_id', NEW.id)
    );
  END IF;

  -- 예약 취소 (cancelled 또는 refunded)
  IF TG_OP = 'UPDATE'
     AND OLD.status NOT IN ('cancelled', 'refunded')
     AND NEW.status IN ('cancelled', 'refunded') THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'reservation_cancelled', 'reservation_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
