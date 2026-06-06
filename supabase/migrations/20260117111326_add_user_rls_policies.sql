-- Wishlist policies (users can only access their own wishlists)
CREATE POLICY "Users can view own wishlists" ON wishlists
FOR SELECT USING (auth.uid() = daycare_id);

CREATE POLICY "Users can insert own wishlists" ON wishlists
FOR INSERT WITH CHECK (auth.uid() = daycare_id);

CREATE POLICY "Users can delete own wishlists" ON wishlists
FOR DELETE USING (auth.uid() = daycare_id);

-- Cart policies (users can only access their own carts)
CREATE POLICY "Users can view own carts" ON carts
FOR SELECT USING (auth.uid() = daycare_id);

CREATE POLICY "Users can insert own carts" ON carts
FOR INSERT WITH CHECK (auth.uid() = daycare_id);

CREATE POLICY "Users can update own carts" ON carts
FOR UPDATE USING (auth.uid() = daycare_id);

CREATE POLICY "Users can delete own carts" ON carts
FOR DELETE USING (auth.uid() = daycare_id);

-- Reservations policies (users can only view their own reservations)
CREATE POLICY "Users can view own reservations" ON reservations
FOR SELECT USING (auth.uid() = daycare_id);

-- Inquiries policies (users can only access their own inquiries)
CREATE POLICY "Users can view own inquiries" ON inquiries
FOR SELECT USING (auth.uid() = daycare_id);

CREATE POLICY "Users can insert own inquiries" ON inquiries
FOR INSERT WITH CHECK (auth.uid() = daycare_id);

-- Daycares policies (users can view and update their own profile)
CREATE POLICY "Users can view own daycare profile" ON daycares
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own daycare profile" ON daycares
FOR UPDATE USING (auth.uid() = id);

-- Reviews policies (users can manage their own reviews)
CREATE POLICY "Users can insert own reviews" ON reviews
FOR INSERT WITH CHECK (auth.uid() = daycare_id);

CREATE POLICY "Users can update own reviews" ON reviews
FOR UPDATE USING (auth.uid() = daycare_id);

CREATE POLICY "Users can delete own reviews" ON reviews
FOR DELETE USING (auth.uid() = daycare_id);
