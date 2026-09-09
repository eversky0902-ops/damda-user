-- Do not expose the operational businesses table to every authenticated user.
-- It contains representative, contact and registration fields in addition to
-- customer-facing catalogue fields. The consumer catalogue is a members-only
-- service, while a business owner may only read its own places.

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.businesses;
DROP POLICY IF EXISTS "Allow public read access to businesses" ON public.businesses;
DROP POLICY IF EXISTS "Public reads active businesses" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can view own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Approved daycares view visible businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admins manage businesses" ON public.businesses;
DROP POLICY IF EXISTS "Active admins manage businesses" ON public.businesses;

CREATE POLICY "Approved daycares view visible businesses" ON public.businesses
  FOR SELECT TO authenticated
  USING (is_visible = true AND public.is_daycare());

CREATE POLICY "Business owners view own businesses" ON public.businesses
  FOR SELECT TO authenticated
  USING (business_owner_id = public.current_business_owner_id());

CREATE POLICY "Active admins manage businesses" ON public.businesses
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

REVOKE ALL ON TABLE public.businesses FROM anon;
