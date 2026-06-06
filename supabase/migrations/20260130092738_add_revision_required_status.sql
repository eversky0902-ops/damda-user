-- daycares 테이블에 보완필요 관련 필드 추가
ALTER TABLE daycares 
ADD COLUMN IF NOT EXISTS revision_reason TEXT,
ADD COLUMN IF NOT EXISTS revision_response TEXT,
ADD COLUMN IF NOT EXISTS revision_file TEXT,
ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS revision_submitted_at TIMESTAMPTZ;

-- 기존 status 컬럼의 check constraint 확인 및 업데이트
-- (status가 text 타입이므로 enum이 아닌 경우 constraint만 추가)
COMMENT ON COLUMN daycares.status IS 'pending: 가입대기, requested: 승인요청, approved: 승인완료, rejected: 승인거절, revision_required: 보완필요';
COMMENT ON COLUMN daycares.revision_reason IS '보완필요 사유 (관리자 입력)';
COMMENT ON COLUMN daycares.revision_response IS '보완 응답 (사용자 입력)';
COMMENT ON COLUMN daycares.revision_file IS '보완 첨부파일 URL';
COMMENT ON COLUMN daycares.revision_requested_at IS '보완 요청 일시';
COMMENT ON COLUMN daycares.revision_submitted_at IS '보완 제출 일시';
