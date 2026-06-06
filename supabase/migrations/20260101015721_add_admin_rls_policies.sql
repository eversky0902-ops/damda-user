-- 관리자용 RLS 정책 추가 (business_owners)
CREATE POLICY "Admins can view all business owners" ON business_owners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );

CREATE POLICY "Admins can update all business owners" ON business_owners
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );

CREATE POLICY "Admins can insert business owners" ON business_owners
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );

-- 관리자용 RLS 정책 추가 (settlements)
CREATE POLICY "Admins can view all settlements" ON settlements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );

-- 관리자용 RLS 정책 추가 (commission_histories)
CREATE POLICY "Admins can view all commission histories" ON commission_histories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );

CREATE POLICY "Admins can insert commission histories" ON commission_histories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.is_active = true
    )
  );
