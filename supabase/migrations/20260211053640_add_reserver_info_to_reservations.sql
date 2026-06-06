ALTER TABLE reservations
  ADD COLUMN reserver_name text,
  ADD COLUMN reserver_phone text,
  ADD COLUMN reserver_email text;

COMMENT ON COLUMN reservations.reserver_name IS '예약시 입력한 예약자명';
COMMENT ON COLUMN reservations.reserver_phone IS '예약시 입력한 연락처';
COMMENT ON COLUMN reservations.reserver_email IS '예약시 입력한 이메일';
