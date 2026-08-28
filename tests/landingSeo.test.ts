import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const heroSource = readFileSync(new URL("../src/components/landing/Hero.tsx", import.meta.url), "utf8");
const reviewsSource = readFileSync(new URL("../src/components/landing/Reviews.tsx", import.meta.url), "utf8");
const popularSource = readFileSync(new URL("../src/components/landing/PopularProducts.tsx", import.meta.url), "utf8");
const businessCardSource = readFileSync(new URL("../src/components/businesses/BusinessOwnerCard.tsx", import.meta.url), "utf8");

test("homepage uses the requested SEO title and description", () => {
  assert.match(pageSource, /어린이집 단체체험학습·현장체험 예약 \| 담다/);
  assert.match(pageSource, /지역·연령·참여 인원에 맞는 어린이집 단체체험학습 프로그램/);
});

test("landing hero contains exactly one h1 with the primary phrase", () => {
  assert.equal((heroSource.match(/<h1\b/g) || []).length, 1);
  assert.match(heroSource, /어린이집 단체체험학습,/);
  assert.match(heroSource, /비교하고 한 번에 예약하세요/);
});

test("landing reviews combine actual reviews with the sample rotation", () => {
  assert.match(reviewsSource, /SAMPLE_REVIEWS/);
  assert.match(reviewsSource, /\[\.\.\.actualReviews, \.\.\.SAMPLE_REVIEWS\]/);
  assert.match(reviewsSource, /review\.id\.startsWith\("sample-review-"\) \? "sample" : "actual"/);
});

test("popular businesses show business-only cards with discount rates", () => {
  assert.match(popularSource, /인기 체험 업체/);
  assert.match(popularSource, /showPrice=\{false\}/);
  assert.match(popularSource, /showProductName=\{false\}/);
  assert.match(popularSource, /showPublicDetails=\{false\}/);
  assert.match(businessCardSource, /showPublicDetails \? null : DEFAULT_IMAGE/);
  assert.match(businessCardSource, /text-red-500/);
  assert.match(businessCardSource, /최대 \$\{maxDiscountRate\}% 할인/);
});

test("homepage keeps existing structured data and adds visible FAQ data", () => {
  assert.match(pageSource, /organizationJsonLd/);
  assert.match(pageSource, /websiteJsonLd/);
  assert.match(pageSource, /FAQPage/);
  assert.match(pageSource, /landingFaqItems/);
});
