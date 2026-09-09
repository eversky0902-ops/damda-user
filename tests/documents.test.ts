import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DOCUMENT_PUBLISHER,
  DOCUMENT_TYPES,
  initialEditableContent,
  isDocumentType,
} from "../src/lib/documents.ts";

test("provides every required reservation document type", () => {
  assert.deepEqual(Object.values(DOCUMENT_TYPES), [
    "견적서",
    "대금명세서",
    "가정통신문",
    "체험학습 안내문",
    "업체·견학지 안내서",
    "부모교육지",
    "안전교육지",
  ]);
  assert.equal(isDocumentType("quotation"), true);
  assert.equal(isDocumentType("tax_invoice"), false);
});

test("uses the approved default publisher identity", () => {
  assert.deepEqual(DEFAULT_DOCUMENT_PUBLISHER, {
    company_name: "담다",
    business_number: "660-08-02811",
    representative: "이승규",
  });
});

test("copies teacher guidance into a new editable draft", () => {
  const content = initialEditableContent("experience_notice", {
    clothingGuidance: "활동하기 편한 복장",
    fieldContact: "010-1234-5678",
    teacherNotes: "도착 전 연락",
  });
  assert.equal(content.title, "체험학습 안내문");
  assert.equal(content.clothing, "활동하기 편한 복장");
  assert.equal(content.emergencyContact, "010-1234-5678");
  assert.equal(content.teacherNotes, "도착 전 연락");
});
