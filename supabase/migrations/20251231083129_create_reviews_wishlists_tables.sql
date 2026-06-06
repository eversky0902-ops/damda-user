-- 리뷰 테이블
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id),
  product_id uuid NOT NULL REFERENCES products(id),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviews_daycare_id_idx ON reviews(daycare_id);
CREATE INDEX reviews_product_id_idx ON reviews(product_id);
CREATE INDEX reviews_is_visible_idx ON reviews(is_visible);
CREATE INDEX reviews_is_featured_idx ON reviews(is_featured);

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE reviews IS '상품 리뷰';

-- 리뷰 이미지 테이블
CREATE TABLE review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX review_images_review_id_idx ON review_images(review_id);

COMMENT ON TABLE review_images IS '리뷰 첨부 이미지';

-- 찜 테이블
CREATE TABLE wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX wishlists_daycare_product_unique ON wishlists(daycare_id, product_id);

COMMENT ON TABLE wishlists IS '찜한 상품';
