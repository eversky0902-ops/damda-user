-- 카테고리 테이블 (셀프 참조)
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  depth integer NOT NULL CHECK (depth >= 1 AND depth <= 3),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX categories_parent_id_idx ON categories(parent_id);
CREATE INDEX categories_depth_idx ON categories(depth);
CREATE INDEX categories_sort_order_idx ON categories(sort_order);

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE categories IS '카테고리 (3단계 계층)';

-- 상품 테이블
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_owner_id uuid NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  name varchar(200) NOT NULL,
  summary varchar(500),
  description text,
  thumbnail text NOT NULL,
  original_price integer NOT NULL,
  sale_price integer NOT NULL,
  min_participants integer NOT NULL DEFAULT 1,
  max_participants integer NOT NULL,
  duration_minutes integer,
  address varchar(500),
  latitude decimal(10,7),
  longitude decimal(10,7),
  region varchar(50),
  available_time_slots jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  is_sold_out boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_business_owner_id_idx ON products(business_owner_id);
CREATE INDEX products_category_id_idx ON products(category_id);
CREATE INDEX products_is_visible_idx ON products(is_visible);
CREATE INDEX products_region_idx ON products(region);
CREATE INDEX products_created_at_idx ON products(created_at);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE products IS '체험 상품';

-- 상품 이미지 테이블
CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_images_product_id_idx ON product_images(product_id);

COMMENT ON TABLE product_images IS '상품 추가 이미지';

-- 상품 옵션 테이블
CREATE TABLE product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  price integer NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_options_product_id_idx ON product_options(product_id);

COMMENT ON TABLE product_options IS '상품 옵션 (인원별 가격 등)';

-- 예약 불가일 테이블
CREATE TABLE product_unavailable_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unavailable_date date NOT NULL,
  reason varchar(200),
  is_recurring boolean NOT NULL DEFAULT false,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_unavailable_dates_product_id_idx ON product_unavailable_dates(product_id);

COMMENT ON TABLE product_unavailable_dates IS '상품 예약 불가일';
