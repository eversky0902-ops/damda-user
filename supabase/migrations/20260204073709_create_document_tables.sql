-- 사업주 문서 테이블
CREATE TABLE IF NOT EXISTS business_owner_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  document_type varchar NOT NULL CHECK (document_type IN ('business_registration', 'bank_account', 'business_license', 'other')),
  file_name varchar NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type varchar,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 사업주 문서 테이블 코멘트
COMMENT ON TABLE business_owner_documents IS '사업주 문서 (사업자등록증, 통장사본, 영업신고증 등)';
COMMENT ON COLUMN business_owner_documents.document_type IS 'business_registration: 사업자등록증, bank_account: 통장사본, business_license: 영업신고증, other: 기타';

-- 어린이집 문서 테이블
CREATE TABLE IF NOT EXISTS daycare_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  document_type varchar NOT NULL CHECK (document_type IN ('license', 'other')),
  file_name varchar NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type varchar,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 어린이집 문서 테이블 코멘트
COMMENT ON TABLE daycare_documents IS '어린이집 문서 (인가증 등)';
COMMENT ON COLUMN daycare_documents.document_type IS 'license: 인가증, other: 기타';

-- RLS 활성화
ALTER TABLE business_owner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE daycare_documents ENABLE ROW LEVEL SECURITY;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_business_owner_documents_owner_id ON business_owner_documents(business_owner_id);
CREATE INDEX IF NOT EXISTS idx_daycare_documents_daycare_id ON daycare_documents(daycare_id);
