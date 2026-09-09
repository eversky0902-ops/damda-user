ALTER TABLE reservation_holds
  ADD COLUMN slot_time TIME,
  ADD COLUMN participant_count INT NOT NULL DEFAULT 1;

ALTER TABLE reservation_holds DROP CONSTRAINT unique_product_date_hold;

CREATE UNIQUE INDEX uniq_hold_slot ON reservation_holds (product_id, reserved_date, slot_time)
  WHERE slot_time IS NOT NULL;
CREATE INDEX idx_hold_lookup ON reservation_holds (product_id, reserved_date, slot_time);
