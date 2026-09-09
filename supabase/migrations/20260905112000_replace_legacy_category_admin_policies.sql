-- Legacy category policies trusted auth.jwt().user_metadata.admin_id.
-- User metadata is not an authorization boundary. Reuse the authoritative
-- admins-table guard that is based on auth.uid().

DROP POLICY IF EXISTS "Admins can view all categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

CREATE POLICY "Active admins manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());
