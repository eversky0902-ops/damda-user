-- business_owner_documents RLS 정책
CREATE POLICY "Allow all for authenticated users on business_owner_documents"
ON business_owner_documents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- daycare_documents RLS 정책
-- 어린이집 본인 문서 조회/생성/삭제
CREATE POLICY "Daycares can manage own documents"
ON daycare_documents
FOR ALL
TO authenticated
USING (daycare_id = auth.uid())
WITH CHECK (daycare_id = auth.uid());

-- 관리자는 모든 문서 관리 가능 (user_metadata에 role이 있는 경우)
CREATE POLICY "Admins can manage all daycare documents"
ON daycare_documents
FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
);
