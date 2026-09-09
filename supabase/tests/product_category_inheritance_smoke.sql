BEGIN;

DO $$
DECLARE
  v_owner_id uuid := gen_random_uuid();
  v_business_id uuid;
  v_product_id uuid;
  v_explicit_product_id uuid;
  v_category_one uuid := gen_random_uuid();
  v_category_two uuid := gen_random_uuid();
  v_category_three uuid := gen_random_uuid();
  v_business_number text;
  v_actual_category uuid;
BEGIN
  INSERT INTO public.categories (id, name, depth, sort_order, is_active)
  VALUES
    (v_category_one, '__상품카테고리상속_1__', 1, 99991, true),
    (v_category_two, '__상품카테고리상속_2__', 1, 99992, true),
    (v_category_three, '__상품카테고리명시_보존__', 1, 99993, true);

  LOOP
    v_business_number := '9' || lpad(floor(random() * 1000000000)::bigint::text, 9, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.business_owners WHERE business_number = v_business_number
    );
  END LOOP;

  INSERT INTO public.business_owners (
    id, email, name, business_number, representative,
    contact_name, contact_phone, address, status
  ) VALUES (
    v_owner_id,
    'product-category-' || v_owner_id::text || '@example.test',
    '__상품카테고리상속_사업주__',
    v_business_number,
    '__검증대표자__',
    '__검증담당자__',
    '01000000000',
    '',
    'inactive'
  );

  SELECT id INTO STRICT v_business_id
  FROM public.businesses
  WHERE business_owner_id = v_owner_id AND is_primary = true;

  UPDATE public.businesses
  SET category_id = v_category_one
  WHERE id = v_business_id;

  INSERT INTO public.products (
    business_owner_id, business_id, category_id, name, thumbnail,
    original_price, sale_price, min_participants, max_participants, is_visible
  ) VALUES (
    v_owner_id, v_business_id, NULL, '__상속상품__', '/test.jpg',
    10000, 9000, 1, 10, false
  ) RETURNING id, category_id INTO v_product_id, v_actual_category;

  IF v_actual_category IS DISTINCT FROM v_category_one THEN
    RAISE EXCEPTION 'A product with no category did not inherit its business category';
  END IF;

  INSERT INTO public.products (
    business_owner_id, business_id, category_id, name, thumbnail,
    original_price, sale_price, min_participants, max_participants, is_visible
  ) VALUES (
    v_owner_id, v_business_id, v_category_three, '__명시상품__', '/test.jpg',
    10000, 9000, 1, 10, false
  ) RETURNING id, category_id INTO v_explicit_product_id, v_actual_category;

  IF v_actual_category IS DISTINCT FROM v_category_three THEN
    RAISE EXCEPTION 'An explicit product category was unexpectedly overwritten';
  END IF;

  UPDATE public.businesses
  SET category_id = v_category_two
  WHERE id = v_business_id;

  SELECT category_id INTO v_actual_category
  FROM public.products WHERE id = v_product_id;
  IF v_actual_category IS DISTINCT FROM v_category_two THEN
    RAISE EXCEPTION 'The inherited category did not follow the business category update';
  END IF;

  SELECT category_id INTO v_actual_category
  FROM public.products WHERE id = v_explicit_product_id;
  IF v_actual_category IS DISTINCT FROM v_category_three THEN
    RAISE EXCEPTION 'The explicit product category changed with the business category';
  END IF;
END;
$$;

ROLLBACK;
