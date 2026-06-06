-- =====================
-- reviews RLS
-- =====================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 노출 중인 리뷰는 모두 조회 가능
CREATE POLICY "Anyone can view visible reviews"
  ON reviews FOR SELECT
  USING (is_visible = true OR daycare_id = auth.uid());

-- 어린이집: 본인 리뷰 작성
CREATE POLICY "Daycares can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (daycare_id = auth.uid() AND is_daycare());

-- 어린이집: 본인 리뷰 수정
CREATE POLICY "Daycares can update own reviews"
  ON reviews FOR UPDATE
  USING (daycare_id = auth.uid())
  WITH CHECK (daycare_id = auth.uid());

-- 어린이집: 본인 리뷰 삭제
CREATE POLICY "Daycares can delete own reviews"
  ON reviews FOR DELETE
  USING (daycare_id = auth.uid());

-- =====================
-- review_images RLS
-- =====================
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;

-- 리뷰 이미지 조회
CREATE POLICY "Anyone can view review images"
  ON review_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reviews 
      WHERE reviews.id = review_images.review_id 
      AND (reviews.is_visible = true OR reviews.daycare_id = auth.uid())
    )
  );

-- 어린이집: 본인 리뷰 이미지 관리
CREATE POLICY "Daycares can manage own review images"
  ON review_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM reviews 
      WHERE reviews.id = review_images.review_id 
      AND reviews.daycare_id = auth.uid()
    )
  );

-- =====================
-- wishlists RLS
-- =====================
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- 어린이집: 본인 찜 목록 조회
CREATE POLICY "Daycares can view own wishlists"
  ON wishlists FOR SELECT
  USING (daycare_id = auth.uid());

-- 어린이집: 찜 추가
CREATE POLICY "Daycares can add to wishlist"
  ON wishlists FOR INSERT
  WITH CHECK (daycare_id = auth.uid() AND is_daycare());

-- 어린이집: 찜 삭제
CREATE POLICY "Daycares can remove from wishlist"
  ON wishlists FOR DELETE
  USING (daycare_id = auth.uid());

-- =====================
-- inquiries RLS
-- =====================
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 어린이집: 본인 문의 조회
CREATE POLICY "Daycares can view own inquiries"
  ON inquiries FOR SELECT
  USING (daycare_id = auth.uid());

-- 어린이집: 문의 작성
CREATE POLICY "Daycares can create inquiries"
  ON inquiries FOR INSERT
  WITH CHECK (daycare_id = auth.uid() AND is_daycare());

-- =====================
-- notices RLS
-- =====================
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- 공지사항은 모든 인증된 사용자가 조회 가능
CREATE POLICY "Authenticated users can view visible notices"
  ON notices FOR SELECT
  TO authenticated
  USING (is_visible = true);

-- =====================
-- faqs RLS
-- =====================
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- FAQ는 모든 인증된 사용자가 조회 가능
CREATE POLICY "Authenticated users can view visible faqs"
  ON faqs FOR SELECT
  TO authenticated
  USING (is_visible = true);
