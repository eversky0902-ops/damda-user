-- Production compatibility for environments where the multi-business schema
-- was introduced before the original v2 business-layer migration was recorded.
-- Keep this additive and idempotent so existing operational data is preserved.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS region varchar(100),
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS businesses_is_visible_idx
  ON public.businesses(is_visible);

ALTER TABLE public.reservation_holds
  ADD COLUMN IF NOT EXISTS slot_time time,
  ADD COLUMN IF NOT EXISTS participant_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.reservation_holds
  DROP CONSTRAINT IF EXISTS unique_product_date_hold;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_hold_slot
  ON public.reservation_holds(product_id, reserved_date, slot_time)
  WHERE slot_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hold_lookup
  ON public.reservation_holds(product_id, reserved_date, slot_time);
