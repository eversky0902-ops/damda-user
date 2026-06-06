-- 어드민이 상품을 관리할 수 있도록 RLS 정책 추가

-- products 테이블: 어드민 INSERT
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
);

-- products 테이블: 어드민 UPDATE
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO public
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

-- products 테이블: 어드민 DELETE
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
);

-- products 테이블: 어드민 SELECT (전체 조회)
CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid()
    AND admins.is_active = true
  )
);

-- product_options 테이블: 어드민 ALL
CREATE POLICY "Admins can manage product options"
ON public.product_options
FOR ALL
TO public
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

-- product_images 테이블: 어드민 ALL
CREATE POLICY "Admins can manage product images"
ON public.product_images
FOR ALL
TO public
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
