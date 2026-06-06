-- 이용일이 지난 confirmed 예약을 자동으로 completed로 변경하는 함수
CREATE OR REPLACE FUNCTION auto_complete_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE reservations
  SET status = 'completed',
      updated_at = now()
  WHERE status = 'confirmed'
    AND reserved_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 매일 자정(KST) 05분에 실행 (UTC 15:05)
SELECT cron.schedule(
  'auto-complete-reservations',
  '5 15 * * *',
  $$SELECT auto_complete_reservations()$$
);
