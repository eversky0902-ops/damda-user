-- 특정 상품의 예약 불가능한 날짜 목록 조회 (SECURITY DEFINER로 RLS 우회)
CREATE OR REPLACE FUNCTION get_unavailable_dates(p_product_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  result TEXT[];
BEGIN
  -- 만료된 홀드 정리
  DELETE FROM reservation_holds WHERE expires_at < now();
  
  -- 예약이 있는 날짜 + 홀드가 있는 날짜 조회
  SELECT ARRAY_AGG(DISTINCT reserved_date::TEXT)
  INTO result
  FROM (
    -- 예약이 있는 날짜
    SELECT reserved_date
    FROM reservations
    WHERE product_id = p_product_id
      AND status IN ('pending', 'paid', 'confirmed')
    
    UNION
    
    -- 홀드가 있는 날짜 (현재 사용자 제외)
    SELECT reserved_date
    FROM reservation_holds
    WHERE product_id = p_product_id
      AND expires_at > now()
      AND daycare_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
  ) AS unavailable;
  
  RETURN COALESCE(result, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 특정 상품+날짜의 예약 가능 여부 확인
CREATE OR REPLACE FUNCTION check_reservation_available(
  p_product_id UUID,
  p_reserved_date DATE
)
RETURNS JSON AS $$
DECLARE
  v_has_reservation BOOLEAN;
  v_has_hold BOOLEAN;
  v_hold_by_self BOOLEAN;
BEGIN
  -- 만료된 홀드 정리
  DELETE FROM reservation_holds WHERE expires_at < now();
  
  -- 1. 예약이 있는지 확인
  SELECT EXISTS (
    SELECT 1 FROM reservations
    WHERE product_id = p_product_id
      AND reserved_date = p_reserved_date
      AND status IN ('pending', 'paid', 'confirmed')
  ) INTO v_has_reservation;
  
  IF v_has_reservation THEN
    RETURN json_build_object(
      'available', false,
      'reason', 'already_reserved',
      'message', '해당 날짜에 이미 예약이 있습니다.'
    );
  END IF;
  
  -- 2. 다른 사용자의 홀드가 있는지 확인
  SELECT 
    EXISTS (
      SELECT 1 FROM reservation_holds
      WHERE product_id = p_product_id
        AND reserved_date = p_reserved_date
        AND expires_at > now()
    ),
    EXISTS (
      SELECT 1 FROM reservation_holds
      WHERE product_id = p_product_id
        AND reserved_date = p_reserved_date
        AND expires_at > now()
        AND daycare_id = auth.uid()
    )
  INTO v_has_hold, v_hold_by_self;
  
  IF v_has_hold AND NOT v_hold_by_self THEN
    RETURN json_build_object(
      'available', false,
      'reason', 'hold_by_other',
      'message', '다른 사용자가 결제를 진행 중입니다.'
    );
  END IF;
  
  RETURN json_build_object(
    'available', true,
    'reason', null,
    'message', null
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_unavailable_dates(UUID) IS '특정 상품의 예약 불가능한 날짜 목록 조회';
COMMENT ON FUNCTION check_reservation_available(UUID, DATE) IS '특정 상품+날짜의 예약 가능 여부 확인';
