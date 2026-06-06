-- 관리자용 categories 전체 권한 정책
-- 관리자는 모든 카테고리 조회 가능 (비활성 포함)
CREATE POLICY "Admins can view all categories" ON categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = (auth.jwt() -> 'user_metadata' ->> 'admin_id')::uuid
      AND admins.is_active = true
    )
  );

-- 관리자는 카테고리 생성 가능
CREATE POLICY "Admins can insert categories" ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = (auth.jwt() -> 'user_metadata' ->> 'admin_id')::uuid
      AND admins.is_active = true
    )
  );

-- 관리자는 카테고리 수정 가능
CREATE POLICY "Admins can update categories" ON categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = (auth.jwt() -> 'user_metadata' ->> 'admin_id')::uuid
      AND admins.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = (auth.jwt() -> 'user_metadata' ->> 'admin_id')::uuid
      AND admins.is_active = true
    )
  );

-- 관리자는 카테고리 삭제 가능
CREATE POLICY "Admins can delete categories" ON categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = (auth.jwt() -> 'user_metadata' ->> 'admin_id')::uuid
      AND admins.is_active = true
    )
  );
