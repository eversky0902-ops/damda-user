-- Allow public read access to categories (products catalog browsing)
CREATE POLICY "Allow public read access to categories" ON categories
FOR SELECT USING (is_active = true);

-- Allow public read access to products (catalog browsing)
CREATE POLICY "Allow public read access to products" ON products
FOR SELECT USING (is_visible = true);

-- Allow public read access to business_owners (for product details)
CREATE POLICY "Allow public read access to business_owners" ON business_owners
FOR SELECT USING (status = 'active');

-- Allow public read access to product_options
CREATE POLICY "Allow public read access to product_options" ON product_options
FOR SELECT USING (true);

-- Allow public read access to product_images
CREATE POLICY "Allow public read access to product_images" ON product_images
FOR SELECT USING (true);

-- Allow public read access to reviews (for product reviews display)
CREATE POLICY "Allow public read access to visible reviews" ON reviews
FOR SELECT USING (is_visible = true);

-- Allow public read access to review_images
CREATE POLICY "Allow public read access to review_images" ON review_images
FOR SELECT USING (true);

-- Allow public read access to banners
CREATE POLICY "Allow public read access to visible banners" ON banners
FOR SELECT USING (is_visible = true);

-- Allow public read access to notices
CREATE POLICY "Allow public read access to visible notices" ON notices
FOR SELECT USING (is_visible = true);

-- Allow public read access to FAQs
CREATE POLICY "Allow public read access to visible faqs" ON faqs
FOR SELECT USING (is_visible = true);

-- Allow public read access to popups
CREATE POLICY "Allow public read access to visible popups" ON popups
FOR SELECT USING (is_visible = true);

-- Allow public read access to site_settings
CREATE POLICY "Allow public read access to site_settings" ON site_settings
FOR SELECT USING (true);
