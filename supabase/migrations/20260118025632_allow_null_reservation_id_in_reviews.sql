-- reservation_id를 nullable로 변경 (리뷰가 예약 없이도 등록 가능하도록)
ALTER TABLE reviews ALTER COLUMN reservation_id DROP NOT NULL;
