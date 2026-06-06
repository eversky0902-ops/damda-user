-- settlement_month 컬럼 추가 (YYYY-MM 형식)
ALTER TABLE settlements ADD COLUMN settlement_month VARCHAR(7);

-- 기존 데이터 마이그레이션: settlement_period_end 기준으로 월 추출
UPDATE settlements SET settlement_month = TO_CHAR(settlement_period_end::date, 'YYYY-MM');

-- 인덱스 추가 (월별 조회 성능 향상)
CREATE INDEX idx_settlements_settlement_month ON settlements(settlement_month);
