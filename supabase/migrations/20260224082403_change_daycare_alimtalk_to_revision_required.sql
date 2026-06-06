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

  -- 보완필요
  IF OLD.status IS DISTINCT FROM 'revision_required' AND NEW.status = 'revision_required' THEN
    PERFORM net.http_post(
      url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('event', 'daycare_rejected', 'daycare_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
