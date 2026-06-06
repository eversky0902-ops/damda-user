-- Admin이 모든 리뷰를 수정할 수 있는 정책 추가
CREATE POLICY "Admins can update all reviews"
ON public.reviews
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);

-- Admin이 모든 리뷰를 조회할 수 있는 정책 추가
CREATE POLICY "Admins can view all reviews"
ON public.reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);

-- Admin이 리뷰를 삭제할 수 있는 정책 추가
CREATE POLICY "Admins can delete all reviews"
ON public.reviews
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);
