-- Correct an already-active boundary without changing checkout state or financial rows.
-- auth schema belongs to Supabase: use its exact verified-JWT setting semantics
-- through private helpers rather than adding broad hosted-role memberships.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
-- Required to replace owned public functions; restored before this transaction commits.
GRANT CREATE ON SCHEMA public TO damda_payment_code;
SET LOCAL ROLE damda_payment_code;
CREATE OR REPLACE FUNCTION payment_private.jwt_role() RETURNS text
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),
    (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'role'))::text
$$;
CREATE OR REPLACE FUNCTION payment_private.jwt_uid() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
    (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub'))::uuid
$$;
REVOKE ALL ON FUNCTION payment_private.jwt_role(),payment_private.jwt_uid() FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE f record; definition text; BEGIN
  FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE p.proowner=(SELECT oid FROM pg_roles WHERE rolname='damda_payment_code')
      AND (n.nspname='payment_private' OR (n.nspname='public' AND p.proname IN
        ('create_verified_payment_order','finalize_verified_payment','register_payment_authentication',
         'claim_payment_approval','record_payment_review','claim_payment_notification','finish_payment_notification')))
      AND (position('auth.role()' in p.prosrc)>0 OR position('auth.uid()' in p.prosrc)>0)
  LOOP
    definition := replace(replace(pg_get_functiondef(f.oid),'auth.role()','payment_private.jwt_role()'),
      'auth.uid()','payment_private.jwt_uid()');
    EXECUTE definition;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE p.proowner=(SELECT oid FROM pg_roles WHERE rolname='damda_payment_code')
      AND n.nspname IN ('payment_private','public')
      AND (position('auth.role()' in p.prosrc)>0 OR position('auth.uid()' in p.prosrc)>0)) THEN
    RAISE EXCEPTION 'payment function still depends on inaccessible auth schema';
  END IF;
END $$;
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM damda_payment_code;
SELECT public.assert_payment_boundary();
COMMIT;
