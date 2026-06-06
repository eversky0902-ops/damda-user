CREATE TABLE product_preview_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_owner_id UUID NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_preview_token UNIQUE (token)
);

CREATE INDEX idx_preview_tokens_lookup ON product_preview_tokens(token, expires_at);
ALTER TABLE product_preview_tokens ENABLE ROW LEVEL SECURITY;

-- 사업주는 자기 상품에 대한 토큰만 생성 가능
CREATE POLICY "bo_insert_own" ON product_preview_tokens FOR INSERT
  WITH CHECK (business_owner_id = auth.uid() AND EXISTS (
    SELECT 1 FROM products WHERE id = product_id AND business_owner_id = auth.uid()
  ));

-- 토큰 검증용: 만료되지 않은 토큰은 누구나 조회 가능
CREATE POLICY "anyone_select_valid" ON product_preview_tokens FOR SELECT
  USING (expires_at > now());
