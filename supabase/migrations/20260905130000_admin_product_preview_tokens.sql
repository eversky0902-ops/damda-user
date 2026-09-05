CREATE OR REPLACE FUNCTION public.create_admin_product_preview_token(
  p_product_id uuid
)
RETURNS TABLE(token uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_owner_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE id = auth.uid() AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  SELECT p.business_owner_id
  INTO v_business_owner_id
  FROM public.products p
  WHERE p.id = p_product_id;

  IF v_business_owner_id IS NULL THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  DELETE FROM public.product_preview_tokens ppt
  WHERE ppt.product_id = p_product_id
    AND ppt.expires_at <= now();

  RETURN QUERY
  INSERT INTO public.product_preview_tokens(product_id, business_owner_id)
  VALUES (p_product_id, v_business_owner_id)
  RETURNING product_preview_tokens.token, product_preview_tokens.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_admin_product_preview_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_product_preview_token(uuid) TO authenticated;

COMMENT ON FUNCTION public.create_admin_product_preview_token(uuid)
  IS 'Creates a one-hour product preview token for an authenticated active administrator.';

DROP POLICY IF EXISTS anyone_select_valid ON public.product_preview_tokens;
DROP POLICY IF EXISTS preview_token_owner_select ON public.product_preview_tokens;

CREATE POLICY preview_token_owner_select
ON public.product_preview_tokens
FOR SELECT
TO authenticated
USING (
  business_owner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.admins a
    WHERE a.id = auth.uid()
      AND a.is_active = true
  )
);

REVOKE SELECT ON TABLE public.product_preview_tokens FROM anon;
GRANT SELECT ON TABLE public.product_preview_tokens TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_product_preview_token(
  p_product_id uuid,
  p_token uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.product_preview_tokens ppt
    WHERE ppt.product_id = p_product_id
      AND ppt.token = p_token
      AND ppt.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.validate_product_preview_token(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_product_preview_token(uuid, uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.validate_product_preview_token(uuid, uuid)
  IS 'Validates a supplied product preview token without exposing the token table.';

CREATE OR REPLACE FUNCTION public.get_product_preview(
  p_product_id uuid,
  p_token uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(p) || jsonb_build_object(
    'business_owner', jsonb_build_object(
      'id', coalesce(b.id, bo.id),
      'name', coalesce(b.name, bo.name),
      'logo_url', coalesce(b.logo_url, bo.logo_url)
    ),
    'category', CASE
      WHEN c.id IS NULL THEN NULL
      ELSE jsonb_build_object('id', c.id, 'name', c.name, 'parent_id', c.parent_id)
    END,
    'images', coalesce((
      SELECT jsonb_agg(to_jsonb(pi) ORDER BY pi.sort_order)
      FROM public.product_images pi
      WHERE pi.product_id = p.id
    ), '[]'::jsonb),
    'options', coalesce((
      SELECT jsonb_agg(to_jsonb(po) ORDER BY po.sort_order)
      FROM public.product_options po
      WHERE po.product_id = p.id
    ), '[]'::jsonb),
    'unavailable_dates', coalesce((
      SELECT jsonb_agg(to_jsonb(pud) ORDER BY pud.unavailable_date)
      FROM public.product_unavailable_dates pud
      WHERE pud.product_id = p.id
    ), '[]'::jsonb)
  )
  FROM public.product_preview_tokens ppt
  JOIN public.products p ON p.id = ppt.product_id
  JOIN public.business_owners bo ON bo.id = p.business_owner_id
  LEFT JOIN public.businesses b ON b.id = p.business_id
  LEFT JOIN public.categories c ON c.id = p.category_id
  WHERE ppt.token = p_token
    AND ppt.product_id = p_product_id
    AND ppt.expires_at > now()
    AND bo.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.get_product_preview(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_preview(uuid, uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_product_preview(uuid, uuid)
  IS 'Returns one product preview bundle after validating an unexpired preview token.';
