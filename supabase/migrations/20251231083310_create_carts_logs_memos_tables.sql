-- 장바구니 테이블
CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reserved_date date,
  reserved_time time,
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX carts_daycare_id_idx ON carts(daycare_id);

CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE carts IS '장바구니';

-- 관리자 활동 로그 테이블
CREATE TABLE admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id),
  action varchar(50) NOT NULL,
  target_type varchar(50) NOT NULL,
  target_id uuid NOT NULL,
  before_data jsonb,
  after_data jsonb,
  ip_address varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_logs_admin_id_idx ON admin_logs(admin_id);
CREATE INDEX admin_logs_action_idx ON admin_logs(action);
CREATE INDEX admin_logs_target_type_idx ON admin_logs(target_type);
CREATE INDEX admin_logs_created_at_idx ON admin_logs(created_at);

COMMENT ON TABLE admin_logs IS '관리자 활동 로그';

-- 어린이집 메모 테이블
CREATE TABLE daycare_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES admins(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX daycare_memos_daycare_id_idx ON daycare_memos(daycare_id);

COMMENT ON TABLE daycare_memos IS '어린이집 관리자 메모';
