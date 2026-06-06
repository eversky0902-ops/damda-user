ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daycare_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_unavailable_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daycares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_owner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daycare_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_preview_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view visible ad banners" ON public.ad_banners; CREATE POLICY "Anyone can view visible ad banners" ON public.ad_banners AS PERMISSIVE FOR SELECT TO public USING ((is_visible = true));
DROP POLICY IF EXISTS "Authenticated users can manage ad banners" ON public.ad_banners; CREATE POLICY "Authenticated users can manage ad banners" ON public.ad_banners AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'authenticated'::text));
DROP POLICY IF EXISTS "Admin full access banners" ON public.banners; CREATE POLICY "Admin full access banners" ON public.banners AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access to visible banners" ON public.banners; CREATE POLICY "Allow public read access to visible banners" ON public.banners AS PERMISSIVE FOR SELECT TO public USING ((is_visible = true));
DROP POLICY IF EXISTS "Authenticated users can view active banners" ON public.banners; CREATE POLICY "Authenticated users can view active banners" ON public.banners AS PERMISSIVE FOR SELECT TO authenticated USING (((is_visible = true) AND ((start_date IS NULL) OR (start_date <= now())) AND ((end_date IS NULL) OR (end_date >= now()))));
DROP POLICY IF EXISTS "Allow all for authenticated users on business_owner_documents" ON public.business_owner_documents; CREATE POLICY "Allow all for authenticated users on business_owner_documents" ON public.business_owner_documents AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can insert business owners" ON public.business_owners; CREATE POLICY "Admins can insert business owners" ON public.business_owners AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can update all business owners" ON public.business_owners; CREATE POLICY "Admins can update all business owners" ON public.business_owners AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can view all business owners" ON public.business_owners; CREATE POLICY "Admins can view all business owners" ON public.business_owners AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.business_owners; CREATE POLICY "Allow anon read for admin app" ON public.business_owners AS PERMISSIVE FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow public read access to business_owners" ON public.business_owners; CREATE POLICY "Allow public read access to business_owners" ON public.business_owners AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Business owners can insert own profile" ON public.business_owners; CREATE POLICY "Business owners can insert own profile" ON public.business_owners AS PERMISSIVE FOR INSERT TO public WITH CHECK ((id = auth.uid()));
DROP POLICY IF EXISTS "Business owners can update own profile" ON public.business_owners; CREATE POLICY "Business owners can update own profile" ON public.business_owners AS PERMISSIVE FOR UPDATE TO public USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
DROP POLICY IF EXISTS "Business owners can view own profile" ON public.business_owners; CREATE POLICY "Business owners can view own profile" ON public.business_owners AS PERMISSIVE FOR SELECT TO public USING ((id = auth.uid()));
DROP POLICY IF EXISTS "Daycares can add to cart" ON public.carts; CREATE POLICY "Daycares can add to cart" ON public.carts AS PERMISSIVE FOR INSERT TO public WITH CHECK (((daycare_id = auth.uid()) AND is_daycare()));
DROP POLICY IF EXISTS "Daycares can remove from cart" ON public.carts; CREATE POLICY "Daycares can remove from cart" ON public.carts AS PERMISSIVE FOR DELETE TO public USING ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Daycares can update own cart" ON public.carts; CREATE POLICY "Daycares can update own cart" ON public.carts AS PERMISSIVE FOR UPDATE TO public USING ((daycare_id = auth.uid())) WITH CHECK ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Daycares can view own cart" ON public.carts; CREATE POLICY "Daycares can view own cart" ON public.carts AS PERMISSIVE FOR SELECT TO public USING ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Users can delete own carts" ON public.carts; CREATE POLICY "Users can delete own carts" ON public.carts AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Users can insert own carts" ON public.carts; CREATE POLICY "Users can insert own carts" ON public.carts AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Users can update own carts" ON public.carts; CREATE POLICY "Users can update own carts" ON public.carts AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Users can view own carts" ON public.carts; CREATE POLICY "Users can view own carts" ON public.carts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories; CREATE POLICY "Admins can delete categories" ON public.categories AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = (((auth.jwt() -> 'user_metadata'::text) ->> 'admin_id'::text))::uuid) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories; CREATE POLICY "Admins can insert categories" ON public.categories AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = (((auth.jwt() -> 'user_metadata'::text) ->> 'admin_id'::text))::uuid) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories; CREATE POLICY "Admins can update categories" ON public.categories AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = (((auth.jwt() -> 'user_metadata'::text) ->> 'admin_id'::text))::uuid) AND (admins.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = (((auth.jwt() -> 'user_metadata'::text) ->> 'admin_id'::text))::uuid) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can view all categories" ON public.categories; CREATE POLICY "Admins can view all categories" ON public.categories AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = (((auth.jwt() -> 'user_metadata'::text) ->> 'admin_id'::text))::uuid) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories; CREATE POLICY "Allow public read access to categories" ON public.categories AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));
DROP POLICY IF EXISTS "Authenticated users can view active categories" ON public.categories; CREATE POLICY "Authenticated users can view active categories" ON public.categories AS PERMISSIVE FOR SELECT TO authenticated USING ((is_active = true));
DROP POLICY IF EXISTS "Admins can insert commission histories" ON public.commission_histories; CREATE POLICY "Admins can insert commission histories" ON public.commission_histories AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can view all commission histories" ON public.commission_histories; CREATE POLICY "Admins can view all commission histories" ON public.commission_histories AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Business owners can view own commission history" ON public.commission_histories; CREATE POLICY "Business owners can view own commission history" ON public.commission_histories AS PERMISSIVE FOR SELECT TO public USING ((business_owner_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can manage all daycare documents" ON public.daycare_documents; CREATE POLICY "Admins can manage all daycare documents" ON public.daycare_documents AS PERMISSIVE FOR ALL TO authenticated USING ((((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text]))) WITH CHECK ((((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text])));
DROP POLICY IF EXISTS "Daycares can manage own documents" ON public.daycare_documents; CREATE POLICY "Daycares can manage own documents" ON public.daycare_documents AS PERMISSIVE FOR ALL TO authenticated USING ((daycare_id = auth.uid())) WITH CHECK ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can delete daycare_memos" ON public.daycare_memos; CREATE POLICY "Admins can delete daycare_memos" ON public.daycare_memos AS PERMISSIVE FOR DELETE TO public USING (true);
DROP POLICY IF EXISTS "Admins can insert daycare_memos" ON public.daycare_memos; CREATE POLICY "Admins can insert daycare_memos" ON public.daycare_memos AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view all daycare_memos" ON public.daycare_memos; CREATE POLICY "Admins can view all daycare_memos" ON public.daycare_memos AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Admins can insert daycares" ON public.daycares; CREATE POLICY "Admins can insert daycares" ON public.daycares AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can update all daycares" ON public.daycares; CREATE POLICY "Admins can update all daycares" ON public.daycares AS PERMISSIVE FOR UPDATE TO public USING (true);
DROP POLICY IF EXISTS "Admins can view all daycares" ON public.daycares; CREATE POLICY "Admins can view all daycares" ON public.daycares AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.daycares; CREATE POLICY "Allow anon read for admin app" ON public.daycares AS PERMISSIVE FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow signup insert" ON public.daycares; CREATE POLICY "Allow signup insert" ON public.daycares AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Daycares can insert own profile" ON public.daycares; CREATE POLICY "Daycares can insert own profile" ON public.daycares AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));
DROP POLICY IF EXISTS "Daycares can update own profile" ON public.daycares; CREATE POLICY "Daycares can update own profile" ON public.daycares AS PERMISSIVE FOR UPDATE TO public USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
DROP POLICY IF EXISTS "Daycares can view own profile" ON public.daycares; CREATE POLICY "Daycares can view own profile" ON public.daycares AS PERMISSIVE FOR SELECT TO public USING ((id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own daycare profile" ON public.daycares; CREATE POLICY "Users can update own daycare profile" ON public.daycares AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));
DROP POLICY IF EXISTS "Users can view own daycare profile" ON public.daycares; CREATE POLICY "Users can view own daycare profile" ON public.daycares AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
DROP POLICY IF EXISTS "Admin full access faqs" ON public.faqs; CREATE POLICY "Admin full access faqs" ON public.faqs AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access to visible faqs" ON public.faqs; CREATE POLICY "Allow public read access to visible faqs" ON public.faqs AS PERMISSIVE FOR SELECT TO public USING ((is_visible = true));
DROP POLICY IF EXISTS "Authenticated users can view visible faqs" ON public.faqs; CREATE POLICY "Authenticated users can view visible faqs" ON public.faqs AS PERMISSIVE FOR SELECT TO authenticated USING ((is_visible = true));
DROP POLICY IF EXISTS "Admin full access inquiries" ON public.inquiries; CREATE POLICY "Admin full access inquiries" ON public.inquiries AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Daycares can create inquiries" ON public.inquiries; CREATE POLICY "Daycares can create inquiries" ON public.inquiries AS PERMISSIVE FOR INSERT TO public WITH CHECK (((daycare_id = auth.uid()) AND is_daycare()));
DROP POLICY IF EXISTS "Daycares can view own inquiries" ON public.inquiries; CREATE POLICY "Daycares can view own inquiries" ON public.inquiries AS PERMISSIVE FOR SELECT TO public USING ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert own inquiries" ON public.inquiries; CREATE POLICY "Users can insert own inquiries" ON public.inquiries AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Users can view own inquiries" ON public.inquiries; CREATE POLICY "Users can view own inquiries" ON public.inquiries AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Admin full access notices" ON public.notices; CREATE POLICY "Admin full access notices" ON public.notices AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access to visible notices" ON public.notices; CREATE POLICY "Allow public read access to visible notices" ON public.notices AS PERMISSIVE FOR SELECT TO public USING ((is_visible = true));
DROP POLICY IF EXISTS "Authenticated users can view visible notices" ON public.notices; CREATE POLICY "Authenticated users can view visible notices" ON public.notices AS PERMISSIVE FOR SELECT TO authenticated USING ((is_visible = true));
DROP POLICY IF EXISTS "Allow delete partner inquiries" ON public.partner_inquiries; CREATE POLICY "Allow delete partner inquiries" ON public.partner_inquiries AS PERMISSIVE FOR DELETE TO public USING (true);
DROP POLICY IF EXISTS "Allow update partner inquiries" ON public.partner_inquiries; CREATE POLICY "Allow update partner inquiries" ON public.partner_inquiries AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can insert partner inquiries" ON public.partner_inquiries; CREATE POLICY "Anyone can insert partner inquiries" ON public.partner_inquiries AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view own inquiries" ON public.partner_inquiries; CREATE POLICY "Users can view own inquiries" ON public.partner_inquiries AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins can update all payments" ON public.payments; CREATE POLICY "Admins can update all payments" ON public.payments AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments; CREATE POLICY "Admins can view all payments" ON public.payments AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.payments; CREATE POLICY "Allow anon read for admin app" ON public.payments AS PERMISSIVE FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon update for admin app" ON public.payments; CREATE POLICY "Allow anon update for admin app" ON public.payments AS PERMISSIVE FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "Business owners can view payments for their products" ON public.payments; CREATE POLICY "Business owners can view payments for their products" ON public.payments AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM reservations
  WHERE ((reservations.id = payments.reservation_id) AND (reservations.business_owner_id = auth.uid())))));
DROP POLICY IF EXISTS "Daycares can insert payments for own reservations" ON public.payments; CREATE POLICY "Daycares can insert payments for own reservations" ON public.payments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM reservations
  WHERE ((reservations.id = payments.reservation_id) AND (reservations.daycare_id = auth.uid())))));
DROP POLICY IF EXISTS "Daycares can view own payments" ON public.payments; CREATE POLICY "Daycares can view own payments" ON public.payments AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM reservations
  WHERE ((reservations.id = payments.reservation_id) AND (reservations.daycare_id = auth.uid())))));
DROP POLICY IF EXISTS "Admin full access popups" ON public.popups; CREATE POLICY "Admin full access popups" ON public.popups AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access to visible popups" ON public.popups; CREATE POLICY "Allow public read access to visible popups" ON public.popups AS PERMISSIVE FOR SELECT TO public USING ((is_visible = true));
DROP POLICY IF EXISTS "Authenticated users can view active popups" ON public.popups; CREATE POLICY "Authenticated users can view active popups" ON public.popups AS PERMISSIVE FOR SELECT TO authenticated USING (((is_visible = true) AND (start_date <= now()) AND (end_date >= now())));
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images; CREATE POLICY "Admins can manage product images" ON public.product_images AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Allow public read access to product_images" ON public.product_images; CREATE POLICY "Allow public read access to product_images" ON public.product_images AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Business owners can manage own product images" ON public.product_images; CREATE POLICY "Business owners can manage own product images" ON public.product_images AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM products
  WHERE ((products.id = product_images.product_id) AND (products.business_owner_id = auth.uid())))));
DROP POLICY IF EXISTS "Users can view product images" ON public.product_images; CREATE POLICY "Users can view product images" ON public.product_images AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM products
  WHERE ((products.id = product_images.product_id) AND ((products.is_visible = true) OR (products.business_owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "Admins can manage product options" ON public.product_options; CREATE POLICY "Admins can manage product options" ON public.product_options AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.product_options; CREATE POLICY "Allow anon read for admin app" ON public.product_options AS PERMISSIVE FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow public read access to product_options" ON public.product_options; CREATE POLICY "Allow public read access to product_options" ON public.product_options AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Business owners can manage own product options" ON public.product_options; CREATE POLICY "Business owners can manage own product options" ON public.product_options AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM products
  WHERE ((products.id = product_options.product_id) AND (products.business_owner_id = auth.uid())))));
DROP POLICY IF EXISTS "Users can view product options" ON public.product_options; CREATE POLICY "Users can view product options" ON public.product_options AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM products
  WHERE ((products.id = product_options.product_id) AND ((products.is_visible = true) OR (products.business_owner_id = auth.uid()))))));
DROP POLICY IF EXISTS anyone_select_valid ON public.product_preview_tokens; CREATE POLICY anyone_select_valid ON public.product_preview_tokens AS PERMISSIVE FOR SELECT TO public USING ((expires_at > now()));
DROP POLICY IF EXISTS bo_insert_own ON public.product_preview_tokens; CREATE POLICY bo_insert_own ON public.product_preview_tokens AS PERMISSIVE FOR INSERT TO public WITH CHECK (((business_owner_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM products
  WHERE ((products.id = product_preview_tokens.product_id) AND (products.business_owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "Admins can manage product unavailable dates" ON public.product_unavailable_dates; CREATE POLICY "Admins can manage product unavailable dates" ON public.product_unavailable_dates AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Allow public read access to product_unavailable_dates" ON public.product_unavailable_dates; CREATE POLICY "Allow public read access to product_unavailable_dates" ON public.product_unavailable_dates AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Business owners can manage own unavailable dates" ON public.product_unavailable_dates; CREATE POLICY "Business owners can manage own unavailable dates" ON public.product_unavailable_dates AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM products
  WHERE ((products.id = product_unavailable_dates.product_id) AND (products.business_owner_id = auth.uid())))));
DROP POLICY IF EXISTS "Users can view unavailable dates" ON public.product_unavailable_dates; CREATE POLICY "Users can view unavailable dates" ON public.product_unavailable_dates AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM products
  WHERE ((products.id = product_unavailable_dates.product_id) AND ((products.is_visible = true) OR (products.business_owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "Admins can delete products" ON public.products; CREATE POLICY "Admins can delete products" ON public.products AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can insert products" ON public.products; CREATE POLICY "Admins can insert products" ON public.products AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can update products" ON public.products; CREATE POLICY "Admins can update products" ON public.products AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can view all products" ON public.products; CREATE POLICY "Admins can view all products" ON public.products AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.products; CREATE POLICY "Allow anon read for admin app" ON public.products AS PERMISSIVE FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products; CREATE POLICY "Allow public read access to products" ON public.products AS PERMISSIVE FOR SELECT TO public USING ((is_visible = true));
DROP POLICY IF EXISTS "Business owners can delete own products" ON public.products; CREATE POLICY "Business owners can delete own products" ON public.products AS PERMISSIVE FOR DELETE TO public USING ((business_owner_id = auth.uid()));
DROP POLICY IF EXISTS "Business owners can insert own products" ON public.products; CREATE POLICY "Business owners can insert own products" ON public.products AS PERMISSIVE FOR INSERT TO public WITH CHECK (((business_owner_id = auth.uid()) AND is_business_owner()));
DROP POLICY IF EXISTS "Business owners can update own products" ON public.products; CREATE POLICY "Business owners can update own products" ON public.products AS PERMISSIVE FOR UPDATE TO public USING ((business_owner_id = auth.uid())) WITH CHECK ((business_owner_id = auth.uid()));
DROP POLICY IF EXISTS "Daycares can view visible products" ON public.products; CREATE POLICY "Daycares can view visible products" ON public.products AS PERMISSIVE FOR SELECT TO public USING (((is_visible = true) OR (business_owner_id = auth.uid())));
DROP POLICY IF EXISTS "Users can delete own recent views" ON public.recent_views; CREATE POLICY "Users can delete own recent views" ON public.recent_views AS PERMISSIVE FOR DELETE TO public USING ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert own recent views" ON public.recent_views; CREATE POLICY "Users can insert own recent views" ON public.recent_views AS PERMISSIVE FOR INSERT TO public WITH CHECK ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own recent views" ON public.recent_views; CREATE POLICY "Users can update own recent views" ON public.recent_views AS PERMISSIVE FOR UPDATE TO public USING ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Users can view own recent views" ON public.recent_views; CREATE POLICY "Users can view own recent views" ON public.recent_views AS PERMISSIVE FOR SELECT TO public USING ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can insert refunds" ON public.refunds; CREATE POLICY "Admins can insert refunds" ON public.refunds AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can update refunds" ON public.refunds; CREATE POLICY "Admins can update refunds" ON public.refunds AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can view all refunds" ON public.refunds; CREATE POLICY "Admins can view all refunds" ON public.refunds AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Allow anon insert for admin app" ON public.refunds; CREATE POLICY "Allow anon insert for admin app" ON public.refunds AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.refunds; CREATE POLICY "Allow anon read for admin app" ON public.refunds AS PERMISSIVE FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon update for admin app" ON public.refunds; CREATE POLICY "Allow anon update for admin app" ON public.refunds AS PERMISSIVE FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "Business owners can view refunds for their products" ON public.refunds; CREATE POLICY "Business owners can view refunds for their products" ON public.refunds AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM reservations
  WHERE ((reservations.id = refunds.reservation_id) AND (reservations.business_owner_id = auth.uid())))));
DROP POLICY IF EXISTS "Daycares can view own refunds" ON public.refunds; CREATE POLICY "Daycares can view own refunds" ON public.refunds AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM reservations
  WHERE ((reservations.id = refunds.reservation_id) AND (reservations.daycare_id = auth.uid())))));
DROP POLICY IF EXISTS regions_select_policy ON public.regions; CREATE POLICY regions_select_policy ON public.regions AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Users can create holds" ON public.reservation_holds; CREATE POLICY "Users can create holds" ON public.reservation_holds AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Users can delete own holds" ON public.reservation_holds; CREATE POLICY "Users can delete own holds" ON public.reservation_holds AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Users can view own holds" ON public.reservation_holds; CREATE POLICY "Users can view own holds" ON public.reservation_holds AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.reservation_options; CREATE POLICY "Allow anon read for admin app" ON public.reservation_options AS PERMISSIVE FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Daycares can insert reservation options" ON public.reservation_options; CREATE POLICY "Daycares can insert reservation options" ON public.reservation_options AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM reservations
  WHERE ((reservations.id = reservation_options.reservation_id) AND (reservations.daycare_id = auth.uid())))));
DROP POLICY IF EXISTS "Users can view reservation options" ON public.reservation_options; CREATE POLICY "Users can view reservation options" ON public.reservation_options AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM reservations
  WHERE ((reservations.id = reservation_options.reservation_id) AND ((reservations.daycare_id = auth.uid()) OR (reservations.business_owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "Admins can update all reservations" ON public.reservations; CREATE POLICY "Admins can update all reservations" ON public.reservations AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservations; CREATE POLICY "Admins can view all reservations" ON public.reservations AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Allow anon read for admin app" ON public.reservations; CREATE POLICY "Allow anon read for admin app" ON public.reservations AS PERMISSIVE FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon update for admin app" ON public.reservations; CREATE POLICY "Allow anon update for admin app" ON public.reservations AS PERMISSIVE FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "Business owners can update own reservations" ON public.reservations; CREATE POLICY "Business owners can update own reservations" ON public.reservations AS PERMISSIVE FOR UPDATE TO public USING ((business_owner_id = auth.uid())) WITH CHECK ((business_owner_id = auth.uid()));
DROP POLICY IF EXISTS "Business owners can view reservations for their products" ON public.reservations; CREATE POLICY "Business owners can view reservations for their products" ON public.reservations AS PERMISSIVE FOR SELECT TO public USING ((business_owner_id = auth.uid()));
DROP POLICY IF EXISTS "Daycares can create reservations" ON public.reservations; CREATE POLICY "Daycares can create reservations" ON public.reservations AS PERMISSIVE FOR INSERT TO public WITH CHECK (((daycare_id = auth.uid()) AND is_daycare()));
DROP POLICY IF EXISTS "Daycares can update own reservations" ON public.reservations; CREATE POLICY "Daycares can update own reservations" ON public.reservations AS PERMISSIVE FOR UPDATE TO public USING ((daycare_id = auth.uid())) WITH CHECK ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Daycares can view own reservations" ON public.reservations; CREATE POLICY "Daycares can view own reservations" ON public.reservations AS PERMISSIVE FOR SELECT TO public USING ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations; CREATE POLICY "Users can view own reservations" ON public.reservations AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Allow public read access to review_images" ON public.review_images; CREATE POLICY "Allow public read access to review_images" ON public.review_images AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Anyone can view review images" ON public.review_images; CREATE POLICY "Anyone can view review images" ON public.review_images AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM reviews
  WHERE ((reviews.id = review_images.review_id) AND ((reviews.is_visible = true) OR (reviews.daycare_id = auth.uid()))))));
DROP POLICY IF EXISTS "Daycares can manage own review images" ON public.review_images; CREATE POLICY "Daycares can manage own review images" ON public.review_images AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM reviews
  WHERE ((reviews.id = review_images.review_id) AND (reviews.daycare_id = auth.uid())))));
DROP POLICY IF EXISTS "Admins can delete all reviews" ON public.reviews; CREATE POLICY "Admins can delete all reviews" ON public.reviews AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can update all reviews" ON public.reviews; CREATE POLICY "Admins can update all reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews; CREATE POLICY "Admins can view all reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Allow public read access to visible reviews" ON public.reviews; CREATE POLICY "Allow public read access to visible reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO public USING ((is_visible = true));
DROP POLICY IF EXISTS "Anyone can view visible reviews" ON public.reviews; CREATE POLICY "Anyone can view visible reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO public USING (((is_visible = true) OR (daycare_id = auth.uid())));
DROP POLICY IF EXISTS "Daycares can create reviews" ON public.reviews; CREATE POLICY "Daycares can create reviews" ON public.reviews AS PERMISSIVE FOR INSERT TO public WITH CHECK (((daycare_id = auth.uid()) AND is_daycare()));
DROP POLICY IF EXISTS "Daycares can delete own reviews" ON public.reviews; CREATE POLICY "Daycares can delete own reviews" ON public.reviews AS PERMISSIVE FOR DELETE TO public USING ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Daycares can update own reviews" ON public.reviews; CREATE POLICY "Daycares can update own reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO public USING ((daycare_id = auth.uid())) WITH CHECK ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews; CREATE POLICY "Users can delete own reviews" ON public.reviews AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews; CREATE POLICY "Users can insert own reviews" ON public.reviews AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews; CREATE POLICY "Users can update own reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Admins can delete settlements" ON public.settlements; CREATE POLICY "Admins can delete settlements" ON public.settlements AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can insert settlements" ON public.settlements; CREATE POLICY "Admins can insert settlements" ON public.settlements AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can update settlements" ON public.settlements; CREATE POLICY "Admins can update settlements" ON public.settlements AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Admins can view all settlements" ON public.settlements; CREATE POLICY "Admins can view all settlements" ON public.settlements AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.id = auth.uid()) AND (admins.is_active = true)))));
DROP POLICY IF EXISTS "Business owners can view own settlements" ON public.settlements; CREATE POLICY "Business owners can view own settlements" ON public.settlements AS PERMISSIVE FOR SELECT TO public USING ((business_owner_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can insert site_settings" ON public.site_settings; CREATE POLICY "Admins can insert site_settings" ON public.site_settings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can read site_settings" ON public.site_settings; CREATE POLICY "Admins can read site_settings" ON public.site_settings AS PERMISSIVE FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can update site_settings" ON public.site_settings; CREATE POLICY "Admins can update site_settings" ON public.site_settings AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow public read access to site_settings" ON public.site_settings; CREATE POLICY "Allow public read access to site_settings" ON public.site_settings AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles; CREATE POLICY "Users can view own role" ON public.user_roles AS PERMISSIVE FOR SELECT TO public USING ((id = auth.uid()));
DROP POLICY IF EXISTS "Daycares can add to wishlist" ON public.wishlists; CREATE POLICY "Daycares can add to wishlist" ON public.wishlists AS PERMISSIVE FOR INSERT TO public WITH CHECK (((daycare_id = auth.uid()) AND is_daycare()));
DROP POLICY IF EXISTS "Daycares can remove from wishlist" ON public.wishlists; CREATE POLICY "Daycares can remove from wishlist" ON public.wishlists AS PERMISSIVE FOR DELETE TO public USING ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Daycares can view own wishlists" ON public.wishlists; CREATE POLICY "Daycares can view own wishlists" ON public.wishlists AS PERMISSIVE FOR SELECT TO public USING ((daycare_id = auth.uid()));
DROP POLICY IF EXISTS "Users can delete own wishlists" ON public.wishlists; CREATE POLICY "Users can delete own wishlists" ON public.wishlists AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Users can insert own wishlists" ON public.wishlists; CREATE POLICY "Users can insert own wishlists" ON public.wishlists AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = daycare_id));
DROP POLICY IF EXISTS "Users can view own wishlists" ON public.wishlists; CREATE POLICY "Users can view own wishlists" ON public.wishlists AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = daycare_id));
