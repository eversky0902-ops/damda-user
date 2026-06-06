-- DB에서 직접 Aligo API 호출하는 함수 (고정 IP로 나감)
CREATE OR REPLACE FUNCTION send_alimtalk_http(p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _response extensions.http_response;
BEGIN
  SELECT * INTO _response FROM extensions.http((
    'POST',
    'https://kakaoapi.aligo.in/akv10/alimtalk/send/',
    ARRAY[extensions.http_header('Content-Type', 'application/x-www-form-urlencoded')]::extensions.http_header[],
    'application/x-www-form-urlencoded',
    p_body
  )::extensions.http_request);

  RETURN jsonb_build_object(
    'status', _response.status,
    'body', _response.content::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 0,
    'body', jsonb_build_object('code', -1, 'message', SQLERRM)
  );
END;
$$;
