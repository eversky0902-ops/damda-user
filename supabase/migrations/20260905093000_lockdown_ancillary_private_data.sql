-- Follow-up P0 hardening for tables that carry documents, audit trails,
-- support enquiries, or admin-managed content.
-- Requires public.is_active_admin() from 20260905090000_harden_sensitive_data_rls.sql.

-- Do not authorize from user_metadata: Supabase users can edit that claim.
-- The administrator row must match the immutable authenticated user id.
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

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage activity logs" ON public.admin_logs;
CREATE POLICY "Admins manage activity logs" ON public.admin_logs
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());
REVOKE ALL ON TABLE public.admin_logs FROM anon;

DROP POLICY IF EXISTS "Admins can manage all daycare documents" ON public.daycare_documents;
CREATE POLICY "Admins can manage all daycare documents" ON public.daycare_documents
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());
REVOKE ALL ON TABLE public.daycare_documents FROM anon;

DROP POLICY IF EXISTS "Allow all for authenticated users on business_owner_documents" ON public.business_owner_documents;
DROP POLICY IF EXISTS "Admins manage business owner documents" ON public.business_owner_documents;
CREATE POLICY "Admins manage business owner documents" ON public.business_owner_documents
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());
REVOKE ALL ON TABLE public.business_owner_documents FROM anon;

DROP POLICY IF EXISTS "Admin full access inquiries" ON public.inquiries;
CREATE POLICY "Admins manage inquiries" ON public.inquiries
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());
REVOKE ALL ON TABLE public.inquiries FROM anon;

-- Public content remains readable only when explicitly visible. Mutations are
-- restricted to active administrators instead of every authenticated user.
DROP POLICY IF EXISTS "Admin full access banners" ON public.banners;
CREATE POLICY "Admins manage banners" ON public.banners
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admin full access faqs" ON public.faqs;
CREATE POLICY "Admins manage faqs" ON public.faqs
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admin full access notices" ON public.notices;
CREATE POLICY "Admins manage notices" ON public.notices
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admin full access popups" ON public.popups;
CREATE POLICY "Admins manage popups" ON public.popups
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Authenticated users can manage ad banners" ON public.ad_banners;
CREATE POLICY "Admins manage ad banners" ON public.ad_banners
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());
