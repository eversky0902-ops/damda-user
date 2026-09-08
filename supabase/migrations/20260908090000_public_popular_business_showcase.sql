-- 랜딩 페이지에서만 사용하는 최소 공개 업체 정보입니다.
-- 가격, 연락처, 주소 상세, 예약/상품 상세를 반환하지 않아 폐쇄형 카탈로그 정책을 유지합니다.
CREATE OR REPLACE FUNCTION public.get_public_popular_businesses(p_limit integer DEFAULT 8)
RETURNS TABLE (
  business_id uuid,
  business_name text,
  business_logo_url text,
  region text,
  featured_product_id uuid,
  featured_product_name text,
  featured_product_thumbnail text,
  discount_rate integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  WITH ranked_products AS (
    SELECT
      b.id AS business_id,
      b.name AS business_name,
      b.logo_url AS business_logo_url,
      p.region,
      p.id AS product_id,
      p.name AS product_name,
      p.thumbnail AS product_thumbnail,
      p.view_count,
      p.created_at AS product_created_at,
      max(
        CASE
          WHEN p.original_price > p.sale_price AND p.original_price > 0
            THEN round(((p.original_price - p.sale_price)::numeric / p.original_price) * 100)::integer
          ELSE 0
        END
      ) OVER (PARTITION BY b.id) AS max_discount_rate,
      row_number() OVER (
        PARTITION BY b.id
        ORDER BY p.view_count DESC, p.created_at DESC, p.id
      ) AS product_rank
    FROM public.products p
    INNER JOIN public.businesses b
      ON b.id = p.business_id
      AND b.status = 'active'
      AND b.is_visible = true
    INNER JOIN public.business_owners bo
      ON bo.id = p.business_owner_id
      AND bo.status = 'active'
    WHERE p.is_visible = true
      AND p.is_sold_out = false
      AND p.name !~* '(test|테스트)'
      AND b.name !~* '(test|테스트)'
  )
  SELECT
    business_id,
    business_name,
    business_logo_url,
    region,
    product_id,
    product_name,
    product_thumbnail,
    max_discount_rate
  FROM ranked_products
  WHERE product_rank = 1
  ORDER BY view_count DESC, product_created_at DESC, business_id
  LIMIT least(greatest(coalesce(p_limit, 8), 1), 12);
$$;

REVOKE ALL ON FUNCTION public.get_public_popular_businesses(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_popular_businesses(integer) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_popular_businesses(integer) IS
  '랜딩 공개용 업체명·대표이미지·지역·최대할인율만 반환. 실제 가격 및 상세 운영 데이터는 반환하지 않음.';
