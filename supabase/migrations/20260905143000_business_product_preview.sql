CREATE OR REPLACE FUNCTION public.get_business_product_preview(
  p_business_id uuid,
  p_product_id uuid,
  p_token uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH preview_product AS (
    SELECT p.*
    FROM public.product_preview_tokens ppt
    JOIN public.products p ON p.id = ppt.product_id
    JOIN public.business_owners bo ON bo.id = p.business_owner_id
    WHERE ppt.token = p_token
      AND ppt.product_id = p_product_id
      AND ppt.expires_at > now()
      AND p.business_id = p_business_id
      AND bo.status = 'active'
  )
  SELECT jsonb_build_object(
    'business', to_jsonb(b) || jsonb_build_object(
      'place_profile', (
        SELECT to_jsonb(profile)
        FROM public.business_place_profiles profile
        WHERE profile.business_id = b.id
        LIMIT 1
      ),
      'images', coalesce((
        SELECT jsonb_agg(to_jsonb(image) ORDER BY image.is_primary DESC, image.sort_order ASC)
        FROM public.business_place_images image
        WHERE image.business_id = b.id
      ), '[]'::jsonb),
      'hours', coalesce((
        SELECT jsonb_agg(to_jsonb(hour) ORDER BY hour.day_of_week ASC)
        FROM public.business_hours hour
        WHERE hour.business_id = b.id
      ), '[]'::jsonb)
    ),
    'products', coalesce((
      SELECT jsonb_agg(
        to_jsonb(listed_product) || jsonb_build_object(
          'business_owner', jsonb_build_object(
            'id', b.id,
            'name', b.name,
            'logo_url', b.logo_url
          ),
          'business', jsonb_build_object(
            'id', b.id,
            'name', b.name,
            'logo_url', b.logo_url
          ),
          'category', CASE
            WHEN category.id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'id', category.id,
              'name', category.name,
              'parent_id', category.parent_id
            )
          END,
          'images', coalesce((
            SELECT jsonb_agg(to_jsonb(product_image) ORDER BY product_image.sort_order ASC)
            FROM public.product_images product_image
            WHERE product_image.product_id = listed_product.id
          ), '[]'::jsonb),
          'review_count', (
            SELECT count(*)
            FROM public.reviews review
            WHERE review.product_id = listed_product.id
              AND review.is_visible = true
          ),
          'average_rating', coalesce((
            SELECT round(avg(review.rating)::numeric, 1)
            FROM public.reviews review
            WHERE review.product_id = listed_product.id
              AND review.is_visible = true
          ), 0)
        )
        ORDER BY
          CASE WHEN listed_product.id = p_product_id THEN 0 ELSE 1 END,
          listed_product.display_order ASC,
          listed_product.created_at DESC
      )
      FROM public.products listed_product
      LEFT JOIN public.categories category ON category.id = listed_product.category_id
      WHERE listed_product.business_id = b.id
        AND (
          listed_product.id = p_product_id
          OR (listed_product.is_visible = true AND listed_product.is_sold_out = false)
        )
    ), '[]'::jsonb)
  )
  FROM preview_product target_product
  JOIN public.businesses b ON b.id = target_product.business_id;
$$;

REVOKE ALL ON FUNCTION public.get_business_product_preview(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_product_preview(uuid, uuid, uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_business_product_preview(uuid, uuid, uuid)
  IS 'Returns the customer-facing business page bundle for an unexpired admin product preview token.';
