export const DOCUMENT_TYPES = {
  quotation: "견적서",
  payment_statement: "대금명세서",
  family_letter: "가정통신문",
  experience_notice: "체험학습 안내문",
  venue_guide: "업체·견학지 안내서",
  parent_education: "부모교육지",
  safety_education: "안전교육지",
} as const;

export type DocumentType = keyof typeof DOCUMENT_TYPES;

export const DEFAULT_DOCUMENT_PUBLISHER = {
  company_name: "담다",
  business_number: "660-08-02811",
  representative: "이승규",
} as const;

export function isDocumentType(value: string): value is DocumentType {
  return Object.hasOwn(DOCUMENT_TYPES, value);
}

export function initialEditableContent(type: DocumentType, snapshot: Record<string, unknown>) {
  return {
    title: DOCUMENT_TYPES[type],
    className: "",
    departureTime: "",
    arrivalTime: "",
    clothing: snapshot.clothingGuidance || "",
    meal: snapshot.mealGuidance || "",
    transportation: snapshot.transportationGuidance || "",
    emergencyContact: snapshot.fieldContact || "",
    teacherNotes: snapshot.teacherNotes || "",
    guardianNotes: snapshot.guardianNotes || "",
    paymentTerms: "",
    validUntil: "",
    notes: "",
    educationPurpose: "",
    educationAudience: "",
    educationContent: "",
    practiceMethod: "",
    checklist: "",
  };
}
