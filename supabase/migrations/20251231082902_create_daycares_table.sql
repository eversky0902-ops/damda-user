-- 어린이집 (회원) 테이블
CREATE TABLE daycares (
  id uuid PRIMARY KEY, -- Supabase Auth uid 연동
  email varchar(255) NOT NULL,
  name varchar(200) NOT NULL,
  representative varchar(100),
  contact_name varchar(100) NOT NULL,
  contact_phone varchar(20) NOT NULL,
  business_number varchar(20),
  license_number varchar(50) NOT NULL,
  license_file text NOT NULL,
  address varchar(500) NOT NULL,
  address_detail varchar(200),
  zipcode varchar(10),
  tel varchar(20),
  capacity integer,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'requested', 'approved', 'rejected')),
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE UNIQUE INDEX daycares_email_unique ON daycares(email);
CREATE INDEX daycares_license_number_idx ON daycares(license_number);
CREATE INDEX daycares_status_idx ON daycares(status);
CREATE INDEX daycares_created_at_idx ON daycares(created_at);

-- updated_at 트리거
CREATE TRIGGER update_daycares_updated_at
  BEFORE UPDATE ON daycares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE daycares IS '어린이집 (회원)';
