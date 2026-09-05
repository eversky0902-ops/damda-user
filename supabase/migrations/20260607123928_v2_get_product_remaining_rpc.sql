CREATE OR REPLACE FUNCTION public.get_product_remaining(p_product_id uuid, p_date date)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(
    COALESCE(
      (SELECT capacity_override FROM product_unavailable_dates
        WHERE product_id = p_product_id AND unavailable_date = p_date
          AND kind = 'capacity' AND capacity_override IS NOT NULL LIMIT 1),
      (SELECT capacity FROM product_schedules
        WHERE product_id = p_product_id AND slot_time IS NULL AND is_active
          AND (day_of_week = EXTRACT(dow FROM p_date)::int OR day_of_week IS NULL)
        ORDER BY day_of_week NULLS LAST LIMIT 1),
      0)
    - COALESCE((SELECT SUM(participant_count) FROM reservations
        WHERE product_id = p_product_id AND reserved_date = p_date
          AND status IN ('pending','paid','confirmed','completed')), 0),
    0)::integer;
$$;
GRANT EXECUTE ON FUNCTION public.get_product_remaining(uuid, date) TO anon, authenticated;
