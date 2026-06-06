-- FK 컬럼에 커버링 인덱스 추가 (Supabase performance advisor: unindexed_foreign_keys 15건)
-- 모든 대상 테이블이 소규모라 즉시 생성되며 락 영향 없음. IF NOT EXISTS로 재실행 안전.
CREATE INDEX IF NOT EXISTS idx_carts_product_id ON public.carts(product_id);
CREATE INDEX IF NOT EXISTS idx_commission_histories_changed_by ON public.commission_histories(changed_by);
CREATE INDEX IF NOT EXISTS idx_daycare_memos_admin_id ON public.daycare_memos(admin_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_answered_by ON public.inquiries(answered_by);
CREATE INDEX IF NOT EXISTS idx_legal_documents_created_by ON public.legal_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_notices_created_by ON public.notices(created_by);
CREATE INDEX IF NOT EXISTS idx_partner_inquiries_reviewed_by ON public.partner_inquiries(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_product_preview_tokens_business_owner_id ON public.product_preview_tokens(business_owner_id);
CREATE INDEX IF NOT EXISTS idx_product_preview_tokens_product_id ON public.product_preview_tokens(product_id);
CREATE INDEX IF NOT EXISTS idx_recent_views_product_id ON public.recent_views(product_id);
CREATE INDEX IF NOT EXISTS idx_refunds_processed_by ON public.refunds(processed_by);
CREATE INDEX IF NOT EXISTS idx_reservation_options_product_option_id ON public.reservation_options(product_option_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reservation_id ON public.reviews(reservation_id);
CREATE INDEX IF NOT EXISTS idx_site_settings_updated_by ON public.site_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON public.wishlists(product_id);
