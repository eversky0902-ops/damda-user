-- 기존 체크 제약조건 삭제
ALTER TABLE daycares DROP CONSTRAINT IF EXISTS daycares_status_check;

-- 새 체크 제약조건 추가 (revision_required 포함)
ALTER TABLE daycares ADD CONSTRAINT daycares_status_check 
CHECK (status IN ('pending', 'requested', 'approved', 'rejected', 'revision_required'));
