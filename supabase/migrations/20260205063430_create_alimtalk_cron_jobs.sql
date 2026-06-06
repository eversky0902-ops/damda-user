-- D-1 리마인더: 매일 00:00 UTC (= 09:00 KST)
SELECT cron.schedule(
  'alimtalk-d1-reminder',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"event": "scheduled_d1_reminder"}'::jsonb
  );
  $$
);

-- 리뷰 요청: 매일 00:00 UTC (= 09:00 KST)
SELECT cron.schedule(
  'alimtalk-review-request',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://eifpjjoawsgdmeeuzhin.supabase.co/functions/v1/send-alimtalk',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"event": "scheduled_review_request"}'::jsonb
  );
  $$
);
