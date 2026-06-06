-- 사업주 테이블
CREATE TABLE business_owners (
  id uuid PRIMARY KEY, -- Supabase Auth uid 연동
  email varchar(255) NOT NULL,
  name varchar(200) NOT NULL,
  business_number varchar(20) NOT NULL,
  representative varchar(100) NOT NULL,
  contact_name varchar(100) NOT NULL,
  contact_phone varchar(20) NOT NULL,
  address varchar(500) NOT NULL,
  address_detail varchar(200),
  zipcode varchar(10),
  latitude decimal(10,7),
  longitude decimal(10,7),
  bank_name varchar(50),
  bank_account varchar(50),
  bank_holder varchar(100),
  commission_rate decimal(5,2) NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 5 AND commission_rate <= 15),
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE UNIQUE INDEX business_owners_email_unique ON business_owners(email);
CREATE UNIQUE INDEX business_owners_business_number_unique ON business_owners(business_number);
CREATE INDEX business_owners_status_idx ON business_owners(status);

-- updated_at 트리거
CREATE TRIGGER update_business_owners_updated_at
  BEFORE UPDATE ON business_owners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE business_owners IS '사업주';

-- 수수료 변경 이력 테이블
CREATE TABLE commission_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  previous_rate decimal(5,2) NOT NULL,
  new_rate decimal(5,2) NOT NULL,
  effective_date date NOT NULL,
  changed_by uuid REFERENCES admins(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX commission_histories_business_owner_id_idx ON commission_histories(business_owner_id);

COMMENT ON TABLE commission_histories IS '수수료 변경 이력';
