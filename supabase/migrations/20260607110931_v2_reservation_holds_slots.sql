-- =====================================================================
-- 2차개발 [3/3] reservation_holds 슬롯/수량 단위 확장 (동시예약 잠금)
-- 선행: 20260607110145_v2_business_layer_data
-- 설계: docs/설계_사업장구조-판매방식_데이터모델.md (4.7 가용성/동시성)
--   time_slot : 슬롯별 잠금(슬롯 1팀 고정)
--   quantity  : 인원수(participant_count) 단위 잠금
--   daily_one : 날짜 잠금
-- =====================================================================

ALTER TABLE reservation_holds
  ADD COLUMN slot_time TIME,
  ADD COLUMN participant_count INT NOT NULL DEFAULT 1;

-- 기존 (product_id, reserved_date) 단일 유니크는 슬롯/수량 모델과 충돌 → 제거
ALTER TABLE reservation_holds DROP CONSTRAINT unique_product_date_hold;

-- 시간대 판매: 한 슬롯 1팀 고정(DB 보장).
-- 슬롯 없는(daily_one/quantity) 잠금은 앱 트랜잭션에서 정원(capacity−예약−홀드) 검증.
CREATE UNIQUE INDEX uniq_hold_slot ON reservation_holds (product_id, reserved_date, slot_time)
  WHERE slot_time IS NOT NULL;
CREATE INDEX idx_hold_lookup ON reservation_holds (product_id, reserved_date, slot_time);
