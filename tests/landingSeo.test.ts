import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const heroSource = readFileSync(new URL("../src/components/landing/Hero.tsx", import.meta.url), "utf8");
const reviewsSource = readFileSync(new URL("../src/components/landing/Reviews.tsx", import.meta.url), "utf8");
const popularSource = readFileSync(new URL("../src/components/landing/PopularProducts.tsx", import.meta.url), "utf8");
const businessCardSource = readFileSync(new URL("../src/components/businesses/BusinessOwnerCard.tsx", import.meta.url), "utf8");
const footerSource = readFileSync(new URL("../src/components/home/MainFooter.tsx", import.meta.url), "utf8");
const emailRejectionSource = readFileSync(new URL("../src/app/(main)/email-rejection/page.tsx", import.meta.url), "utf8");

test("homepage uses the requested SEO title and description", () => {
  assert.match(pageSource, /담다 \| 어린이집·유치원 현장체험학습 예약 플랫폼/);
  assert.match(pageSource, /검증된 체험학습 프로그램을 간편하게 예약하고, 아이들에게 잊지 못할 추억을 선물하세요/);
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
  assert.match(pageSource, /homeStructuredData/);
  assert.match(pageSource, /Organization/);
  assert.match(pageSource, /WebSite/);
  assert.match(pageSource, /FAQPage/);
  assert.match(pageSource, /landingFaqItems/);
});

test("footer links to the email collection rejection notice", () => {
  assert.match(footerSource, /href="\/email-rejection"/);
  assert.match(footerSource, /이메일 무단 수집거부/);
  assert.match(emailRejectionSource, /본 웹사이트에 게시된 이메일 주소/);
  assert.match(emailRejectionSource, /게시일자: 2026년 7월 16일/);
});
