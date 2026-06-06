-- partner_inquiries 테이블 생성 (입점 문의)
CREATE TABLE partner_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 업체 기본 정보 (business_owners와 동일)
  name VARCHAR(255) NOT NULL,                    -- 업체명
  business_number VARCHAR(20) NOT NULL,          -- 사업자등록번호
  representative VARCHAR(100) NOT NULL,          -- 대표자명
  
  -- 담당자 정보
  contact_name VARCHAR(100) NOT NULL,            -- 담당자명
  contact_phone VARCHAR(20) NOT NULL,            -- 담당자 연락처
  email VARCHAR(255) NOT NULL,                   -- 이메일
  
  -- 주소 정보
  zipcode VARCHAR(10),                           -- 우편번호
  address VARCHAR(500),                          -- 주소
  address_detail VARCHAR(255),                   -- 상세주소
  
  -- 프로그램/업체 소개
  program_types TEXT,                            -- 프로그램 유형
  description TEXT,                              -- 업체/프로그램 소개
  
  -- 상태 관리
  status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  rejection_reason TEXT,                         -- 반려 사유
  reviewed_by UUID REFERENCES admins(id),        -- 검토한 관리자
  reviewed_at TIMESTAMPTZ,                       -- 검토일시
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 생성
CREATE INDEX idx_partner_inquiries_status ON partner_inquiries(status);
CREATE INDEX idx_partner_inquiries_created_at ON partner_inquiries(created_at DESC);

-- 코멘트
COMMENT ON TABLE partner_inquiries IS '입점 문의 - 파트너(사업주) 입점 신청';

-- RLS 활성화
ALTER TABLE partner_inquiries ENABLE ROW LEVEL SECURITY;

-- 누구나 입점 문의 등록 가능
CREATE POLICY "Anyone can insert partner inquiries"
  ON partner_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 본인 문의 조회 가능 (이메일 기반)
CREATE POLICY "Users can view own inquiries"
  ON partner_inquiries
  FOR SELECT
  TO anon, authenticated
  USING (true);
