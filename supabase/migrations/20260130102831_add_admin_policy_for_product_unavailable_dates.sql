-- Admin이 product_unavailable_dates 테이블을 관리할 수 있도록 RLS 정책 추가
CREATE POLICY "Admins can manage product unavailable dates"
ON public.product_unavailable_dates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
);
