-- Security hotfix: remove anonymous access to operational and personal data.
-- Admin authorization is derived from auth.uid(), never mutable JWT user_metadata.

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;

-- The admins table contains password hashes and must never be exposed through
-- PostgREST. Edge Functions using the service role bypass this policy.
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view own profile" ON public.admins;
CREATE POLICY "Admins can view own profile" ON public.admins
  FOR SELECT TO authenticated
  USING (id = auth.uid() AND is_active = true);
REVOKE ALL ON TABLE public.admins FROM anon;

-- Remove anonymous read/write access that was incorrectly added for the admin UI.
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.daycares;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.business_owners;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.reservations;
DROP POLICY IF EXISTS "Allow anon update for admin app" ON public.reservations;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.payments;
DROP POLICY IF EXISTS "Allow anon update for admin app" ON public.payments;
DROP POLICY IF EXISTS "Allow anon insert for admin app" ON public.refunds;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.refunds;
DROP POLICY IF EXISTS "Allow anon update for admin app" ON public.refunds;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.reservation_options;

-- Replace permissive admin policies with a server-verified active-admin check.
DROP POLICY IF EXISTS "Admins can insert daycares" ON public.daycares;
DROP POLICY IF EXISTS "Admins can update all daycares" ON public.daycares;
DROP POLICY IF EXISTS "Admins can view all daycares" ON public.daycares;
CREATE POLICY "Admins can insert daycares" ON public.daycares
  FOR INSERT TO authenticated WITH CHECK (public.is_active_admin());
CREATE POLICY "Admins can update all daycares" ON public.daycares
  FOR UPDATE TO authenticated USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());
CREATE POLICY "Admins can view all daycares" ON public.daycares
  FOR SELECT TO authenticated USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can insert business owners" ON public.business_owners;
DROP POLICY IF EXISTS "Admins can update all business owners" ON public.business_owners;
DROP POLICY IF EXISTS "Admins can view all business owners" ON public.business_owners;
DROP POLICY IF EXISTS "Allow public read access to business_owners" ON public.business_owners;
CREATE POLICY "Admins can insert business owners" ON public.business_owners
  FOR INSERT TO authenticated WITH CHECK (public.is_active_admin());
CREATE POLICY "Admins can update all business owners" ON public.business_owners
  FOR UPDATE TO authenticated USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());
CREATE POLICY "Admins can view all business owners" ON public.business_owners
  FOR SELECT TO authenticated USING (public.is_active_admin());
-- Public product cards may use only the explicitly granted summary columns.
CREATE POLICY "Public can view active business owner summary" ON public.business_owners
  FOR SELECT TO anon USING (status = 'active');
REVOKE ALL ON TABLE public.business_owners FROM anon;
GRANT SELECT (id, name, logo_url, status, contact_phone) ON TABLE public.business_owners TO anon;

DROP POLICY IF EXISTS "Admins can update all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservations;
CREATE POLICY "Admins can update all reservations" ON public.reservations
  FOR UPDATE TO authenticated USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());
CREATE POLICY "Admins can view all reservations" ON public.reservations
  FOR SELECT TO authenticated USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can update all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can update all payments" ON public.payments
  FOR UPDATE TO authenticated USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT TO authenticated USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can insert refunds" ON public.refunds;
DROP POLICY IF EXISTS "Admins can view all refunds" ON public.refunds;
CREATE POLICY "Admins can insert refunds" ON public.refunds
  FOR INSERT TO authenticated WITH CHECK (public.is_active_admin());
CREATE POLICY "Admins can view all refunds" ON public.refunds
  FOR SELECT TO authenticated USING (public.is_active_admin());

REVOKE ALL ON TABLE public.daycares FROM anon;
REVOKE ALL ON TABLE public.reservations FROM anon;
REVOKE ALL ON TABLE public.reservation_options FROM anon;
REVOKE ALL ON TABLE public.payments FROM anon;
REVOKE ALL ON TABLE public.refunds FROM anon;

-- Administrative notes and inbound partner enquiries may contain personal data.
DROP POLICY IF EXISTS "Admins can delete daycare_memos" ON public.daycare_memos;
DROP POLICY IF EXISTS "Admins can insert daycare_memos" ON public.daycare_memos;
DROP POLICY IF EXISTS "Admins can view all daycare_memos" ON public.daycare_memos;
CREATE POLICY "Admins can manage daycare memos" ON public.daycare_memos
  FOR ALL TO authenticated USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());
REVOKE ALL ON TABLE public.daycare_memos FROM anon;

DROP POLICY IF EXISTS "Allow delete partner inquiries" ON public.partner_inquiries;
DROP POLICY IF EXISTS "Allow update partner inquiries" ON public.partner_inquiries;
DROP POLICY IF EXISTS "Users can view own inquiries" ON public.partner_inquiries;
CREATE POLICY "Admins can manage partner inquiries" ON public.partner_inquiries
  FOR ALL TO authenticated USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());
REVOKE SELECT, UPDATE, DELETE ON TABLE public.partner_inquiries FROM anon;

-- The public site may create an enquiry, but cannot enumerate or change it.
DROP POLICY IF EXISTS "Anyone can insert partner inquiries" ON public.partner_inquiries;
CREATE POLICY "Anyone can insert partner inquiries" ON public.partner_inquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Hidden products and their options must not be retrievable by direct API calls.
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.products;
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.product_options;
DROP POLICY IF EXISTS "Allow public read access to product_options" ON public.product_options;
CREATE POLICY "Public can view options of visible products" ON public.product_options
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = product_options.product_id
      AND products.is_visible = true
  ));

-- Site settings can contain operational configuration and must not be readable
-- or writable by arbitrary users.
DROP POLICY IF EXISTS "Admins can insert site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can read site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow public read access to site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Active admins update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Active admins insert site settings" ON public.site_settings;
CREATE POLICY "Active admins read site settings" ON public.site_settings
  FOR SELECT TO authenticated USING (public.is_active_admin());
CREATE POLICY "Active admins update site settings" ON public.site_settings
  FOR UPDATE TO authenticated USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());
CREATE POLICY "Active admins insert site settings" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_active_admin());
REVOKE ALL ON TABLE public.site_settings FROM anon;
