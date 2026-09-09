const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCanonicalBusinessId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function getBusinessHref(businessId: string): string {
  if (!isCanonicalBusinessId(businessId)) {
    throw new Error("INVALID_CANONICAL_BUSINESS_ID");
  }
  return `/businesses/${businessId}`;
}

export function getProductBusinessId(product: { business_id: string }): string {
  return product.business_id;
}
