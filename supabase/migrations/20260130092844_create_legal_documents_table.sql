-- 법적 문서 (이용약관, 개인정보처리방침, 환불정책, 예약안내) 테이블
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL CHECK (category IN ('terms', 'privacy', 'refund-policy', 'reservation-guide')),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 카테고리별 최신 문서 조회를 위한 인덱스
CREATE INDEX idx_legal_documents_category ON legal_documents(category, created_at DESC);

-- 공개 문서 조회를 위한 인덱스
CREATE INDEX idx_legal_documents_visible ON legal_documents(category, is_visible);

-- 테이블 코멘트
COMMENT ON TABLE legal_documents IS '법적 문서 (이용약관, 개인정보처리방침, 환불정책, 예약안내)';
COMMENT ON COLUMN legal_documents.category IS '문서 카테고리: terms(이용약관), privacy(개인정보처리방침), refund-policy(환불정책), reservation-guide(예약안내)';
COMMENT ON COLUMN legal_documents.version IS '버전 번호 (카테고리별로 자동 증가)';
COMMENT ON COLUMN legal_documents.is_visible IS '공개 여부 (기본값: 공개)';
