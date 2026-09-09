-- Read-only approved-template lookup, fixed to Aligo's documented endpoint.
CREATE OR REPLACE FUNCTION public.get_alimtalk_template_http(p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
  response extensions.http_response;
BEGIN
  SELECT * INTO response FROM extensions.http((
    'POST',
    'https://kakaoapi.aligo.in/akv10/template/list/',
    ARRAY[extensions.http_header('Content-Type', 'application/x-www-form-urlencoded')]::extensions.http_header[],
    'application/x-www-form-urlencoded',
    p_body
  )::extensions.http_request);
  RETURN jsonb_build_object('status', response.status, 'body', response.content::jsonb);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status', 0, 'body', jsonb_build_object('code', -1));
END;
$$;

REVOKE ALL ON FUNCTION public.get_alimtalk_template_http(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_alimtalk_template_http(text) TO service_role;
