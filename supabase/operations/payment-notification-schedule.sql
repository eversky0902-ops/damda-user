-- Production cutover: run only after verified-v2, boundary activation and the
-- service-authenticated send-alimtalk Edge Function are live. No historical replay.
-- The bearer is provisioned separately in Vault and Vercel; never inline it here.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM payment_private.configuration WHERE singleton AND approvals_enabled AND boundary_activated) THEN
    RAISE EXCEPTION 'activated payment boundary required';
  END IF;
  IF (SELECT count(*) FROM vault.secrets WHERE name='damda_payment_worker_secret') <> 1 THEN
    RAISE EXCEPTION 'one provisioned payment worker secret required';
  END IF;
END $$;
SELECT cron.schedule('damda-verified-payment-notifications','* * * * *',$job$
  SELECT net.http_post(
    url := 'https://withdamda.kr/api/payment/notifications',
    headers := jsonb_build_object('Content-Type','application/json','Authorization',
      'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='damda_payment_worker_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$job$);
COMMIT;
