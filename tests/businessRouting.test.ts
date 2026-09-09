import assert from "node:assert/strict";
import test from "node:test";
import {
  getBusinessHref,
  getProductBusinessId,
  isCanonicalBusinessId,
} from "../src/lib/businessRouting.ts";

const businessId = "758c9764-c90d-47ee-b7c0-274f6a7d343b";
const ownerId = "444aeac1-1d5b-4644-bbfb-0c2c15ca6f00";

test("canonical business ID creates the business detail URL", () => {
  assert.equal(isCanonicalBusinessId(businessId), true);
  assert.equal(getBusinessHref(businessId), `/businesses/${businessId}`);
});

test("product links use business_id instead of business_owner_id", () => {
  const product = { business_id: businessId, business_owner_id: ownerId };
  assert.equal(getProductBusinessId(product), businessId);
  assert.notEqual(getProductBusinessId(product), ownerId);
});

test("invalid IDs cannot be emitted as business links", () => {
  assert.equal(isCanonicalBusinessId("missing-business"), false);
  assert.throws(() => getBusinessHref("missing-business"), /INVALID_CANONICAL_BUSINESS_ID/);
});
