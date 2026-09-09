-- Supply an approved exposure-window filter if needed. Keep a protected, timestamped
-- backup of notification/application/PG logs separately before reconciliation.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT jsonb_build_object(
  'captured_at',now(),
  'orders',coalesce((SELECT jsonb_agg(jsonb_build_object('order_id',order_id,'amount',amount,'status',status,'pg_tid',pg_tid,'reservation_ids',reservation_ids,'created_at',created_at)) FROM public.payment_orders),'[]'::jsonb),
  'payments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'reservation_id',reservation_id,'pg_provider',pg_provider,'pg_tid',pg_tid,'amount',amount,'status',status,'paid_at',paid_at,'created_at',created_at)) FROM public.payments),'[]'::jsonb)
) AS audit_snapshot;
COMMIT;
