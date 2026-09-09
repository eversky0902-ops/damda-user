import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildFreeFormDocxBlob,
  buildFreeFormDocumentHtml,
  calculateFreeFormAmounts,
  FREE_FORM_DEFINITIONS,
  FREE_FORM_TYPES,
  getFreeFormExampleValues,
  getFreeFormInitialValues,
  isFreeFormType,
} from "../src/lib/free-forms.ts";

const listPageSource = readFileSync(new URL("../src/app/(main)/free-forms/page.tsx", import.meta.url), "utf8");
const editorSource = readFileSync(new URL("../src/components/free-forms/FreeFormEditor.tsx", import.meta.url), "utf8");
const mainHeaderSource = readFileSync(new URL("../src/components/home/MainHeader.tsx", import.meta.url), "utf8");
const authMiddlewareSource = readFileSync(new URL("../src/lib/supabase/middleware.ts", import.meta.url), "utf8");

test("publishes exactly six free daycare forms", () => {
  assert.equal(FREE_FORM_DEFINITIONS.length, 6);
  assert.deepEqual(FREE_FORM_TYPES, [
    "quotation",
    "payment-statement",
    "venue-guide",
    "safety-education",
    "parent-education",
    "family-letter",
  ]);
  assert.equal(isFreeFormType("family-letter"), true);
  assert.equal(isFreeFormType("tax-invoice"), false);
});

test("keeps approved Damda issuer information in financial forms", () => {
  const values = getFreeFormInitialValues("payment-statement");
  assert.equal(values.issuerName, "담다");
  assert.equal(values.issuerBusinessNumber, "660-08-02811");
  assert.match(values.issuerAddress, /인천광역시 연수구/);
  assert.match(values.notes, /세금계산서가 아닌/);
});

test("calculates group price, discount, and refund amounts", () => {
  const amount = calculateFreeFormAmounts({
    participantCount: "20",
    unitPrice: "25,000",
    optionAmount: "10,000",
    discountAmount: "50,000",
    refundAmount: "20,000",
  });
  assert.equal(amount.subtotal, 500_000);
  assert.equal(amount.total, 460_000);
  assert.equal(amount.paidTotal, 440_000);
});

test("provides practical example content and escapes downloaded Word HTML", () => {
  const values = getFreeFormExampleValues("venue-guide");
  assert.match(values.developmentAreas, /소근육/);
  assert.match(values.programFlow, /안전 안내/);
  values.venueName = "<script>alert('x')</script>";
  const html = buildFreeFormDocumentHtml("venue-guide", values);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("exports a real DOCX file containing the full document data", async () => {
  const values = getFreeFormExampleValues("quotation");
  const bytes = new Uint8Array(await (await buildFreeFormDocxBlob("quotation", values)).arrayBuffer());
  const payload = new TextDecoder().decode(bytes);
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.match(payload, /word\/document\.xml/);
  assert.match(payload, /체험학습 견적서/);
  assert.match(payload, /도자기 만들기 체험/);
});

test("includes the selected business seal in financial document exports", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array([137, 80, 78, 71]));
  try {
    const values = { ...getFreeFormExampleValues("quotation"), issuerSeal: "true" };
    const bytes = new Uint8Array(await (await buildFreeFormDocxBlob("quotation", values)).arrayBuffer());
    const payload = new TextDecoder().decode(bytes);
    assert.match(payload, /word\/media\/damda-business-seal\.png/);
    assert.match(payload, /word\/_rels\/document\.xml\.rels/);
    assert.match(payload, /<w:drawing>/);
    assert.match(payload, /word\/header1\.xml/);
    assert.match(payload, /word\/media\/damda-document-watermark\.png/);
    assert.match(payload, /담다 로고 워터마크/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("adds a repeating Damda watermark to printable document HTML", () => {
  const html = buildFreeFormDocumentHtml("quotation", getFreeFormExampleValues("quotation"), {
    watermarkImageSrc: "https://withdamda.kr/logo.png",
  });
  assert.match(html, /document-watermark/);
  assert.match(html, /https:\/\/withdamda\.kr\/logo\.png/);
  assert.match(html, /position:fixed/);
});

test("keeps the free-form route linked in navigation and uses one source for exports", () => {
  assert.doesNotMatch(listPageSource, /회원가입 없이 무료/);
  assert.match(editorSource, /buildFreeFormDocxBlob/);
  assert.match(editorSource, /buildFreeFormDocumentHtml\(type, values, \{/);
  assert.match(mainHeaderSource, /href="\/free-forms"/);
  assert.match(mainHeaderSource, /무료 행정서류/);
  assert.match(authMiddlewareSource, /"\/free-forms"/);
});
