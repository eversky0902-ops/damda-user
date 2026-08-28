export const FREE_FORM_TYPES = [
  "quotation",
  "payment-statement",
  "venue-guide",
  "safety-education",
  "parent-education",
  "family-letter",
] as const;

export type FreeFormType = (typeof FREE_FORM_TYPES)[number];
export type FreeFormValues = Record<string, string>;

export type FreeFormField = {
  name: string;
  label: string;
  kind?: "text" | "date" | "time" | "number" | "textarea" | "select";
  placeholder?: string;
  help?: string;
  options?: string[];
  defaultValue?: string;
  exampleValue?: string;
  fullWidth?: boolean;
};

export type FreeFormSection = {
  title: string;
  description?: string;
  fields: FreeFormField[];
};

export type FreeFormDefinition = {
  type: FreeFormType;
  title: string;
  shortTitle: string;
  description: string;
  downloadName: string;
  accent: "yellow" | "teal" | "blue" | "rose" | "violet" | "green";
  sections: FreeFormSection[];
};

const DAMDA_ISSUER_FIELDS: FreeFormField[] = [
  { name: "issuerName", label: "발행 업체명", defaultValue: "담다", exampleValue: "담다" },
  { name: "issuerBusinessNumber", label: "사업자등록번호", defaultValue: "660-08-02811", exampleValue: "660-08-02811" },
  { name: "issuerRepresentative", label: "대표자", defaultValue: "이승규", exampleValue: "이승규" },
  {
    name: "issuerAddress",
    label: "주소",
    defaultValue: "인천광역시 연수구 컨벤시아대로 81, 5층 509호-175A호",
    exampleValue: "인천광역시 연수구 컨벤시아대로 81, 5층 509호-175A호",
    fullWidth: true,
  },
  { name: "issuerPhone", label: "연락처", defaultValue: "010-7625-3711", exampleValue: "010-7625-3711" },
  { name: "documentNumber", label: "문서번호", placeholder: "예: DAMDA-20260828-001", exampleValue: "DAMDA-20260828-001" },
  { name: "issueDate", label: "발행일", kind: "date", defaultValue: "$today" },
];

const RECIPIENT_FIELDS: FreeFormField[] = [
  { name: "recipientName", label: "어린이집·기관명", placeholder: "수신 기관명", exampleValue: "담다어린이집" },
  { name: "recipientRepresentative", label: "대표자·담당자", placeholder: "성명", exampleValue: "김담당" },
  { name: "recipientAddress", label: "기관 주소", placeholder: "주소", exampleValue: "인천광역시 연수구 어린이로 1", fullWidth: true },
];

const AMOUNT_FIELDS: FreeFormField[] = [
  { name: "experienceName", label: "체험·상품명", placeholder: "예: 도자기 만들기 체험", exampleValue: "도자기 만들기 체험", fullWidth: true },
  { name: "experienceDate", label: "이용 예정일", kind: "date", exampleValue: "2026-09-15" },
  { name: "participantCount", label: "인원", kind: "number", placeholder: "0", exampleValue: "20" },
  { name: "unitPrice", label: "1인당 금액", kind: "number", placeholder: "원 단위 숫자", exampleValue: "25000" },
  { name: "optionAmount", label: "옵션·추가금액", kind: "number", placeholder: "없으면 0", exampleValue: "0" },
  { name: "discountAmount", label: "할인금액", kind: "number", placeholder: "없으면 0", exampleValue: "50000" },
  { name: "amountNotes", label: "금액 비고", kind: "textarea", placeholder: "포함사항, 부가세 적용 여부 등을 입력하세요.", exampleValue: "체험 재료비와 강사비 포함 / 별도 옵션 없음", fullWidth: true },
];

export const FREE_FORM_DEFINITIONS: FreeFormDefinition[] = [
  {
    type: "quotation",
    title: "체험학습 견적서",
    shortTitle: "견적서",
    description: "결제 전 내부 품의와 예산 검토에 사용할 수 있는 단체 체험 견적서입니다.",
    downloadName: "체험학습_견적서",
    accent: "yellow",
    sections: [
      { title: "발행자 정보", fields: DAMDA_ISSUER_FIELDS },
      { title: "수신 기관", fields: RECIPIENT_FIELDS },
      { title: "견적 내역", fields: AMOUNT_FIELDS },
      {
        title: "견적 조건",
        fields: [
          { name: "validUntil", label: "견적 유효기간", kind: "date", exampleValue: "2026-09-05" },
          { name: "paymentTerms", label: "결제 조건", placeholder: "예: 예약 확정 시 전액 결제", exampleValue: "예약 확정 시 전액 결제" },
          { name: "refundPolicy", label: "취소·환불 안내", kind: "textarea", placeholder: "취소 및 환불 조건", exampleValue: "취소·환불은 예약 상품에 고지된 기준에 따릅니다.", fullWidth: true },
          { name: "notes", label: "기타 안내", kind: "textarea", placeholder: "추가 안내사항", exampleValue: "본 견적서는 결제 완료 증빙이 아닙니다.", fullWidth: true },
        ],
      },
    ],
  },
  {
    type: "payment-statement",
    title: "대금명세서",
    shortTitle: "대금명세서",
    description: "결제 완료 후 실제 인원·단가·최종 결제금액을 정리하는 거래 내역 문서입니다.",
    downloadName: "대금명세서",
    accent: "teal",
    sections: [
      { title: "발행자 정보", fields: DAMDA_ISSUER_FIELDS },
      { title: "수신 기관", fields: RECIPIENT_FIELDS },
      { title: "결제 금액", fields: AMOUNT_FIELDS },
      {
        title: "결제 정보",
        fields: [
          { name: "paymentDate", label: "결제일", kind: "date", defaultValue: "$today" },
          { name: "paymentMethod", label: "결제수단", kind: "select", options: ["신용카드", "계좌이체", "가상계좌", "현금", "기타"], exampleValue: "신용카드" },
          { name: "transactionId", label: "PG 거래번호", placeholder: "결제 거래번호", exampleValue: "NICEPAY-20260828-001" },
          { name: "paymentStatus", label: "결제상태", kind: "select", options: ["결제 완료", "부분 결제", "결제 취소", "환불 완료"], exampleValue: "결제 완료" },
          { name: "refundAmount", label: "취소·환불금액", kind: "number", placeholder: "없으면 0", exampleValue: "0" },
          { name: "notes", label: "기타 안내", kind: "textarea", defaultValue: "본 문서는 세금계산서가 아닌 거래·결제 내역 문서입니다.", exampleValue: "본 문서는 세금계산서가 아닌 거래·결제 내역 문서입니다.", fullWidth: true },
        ],
      },
    ],
  },
  {
    type: "venue-guide",
    title: "업체·견학지 안내서",
    shortTitle: "견학지 안내서",
    description: "활동 내용, 교육적 기대 경험, 준비물과 현장 실무 정보를 한 장에 정리합니다.",
    downloadName: "업체_견학지_안내서",
    accent: "blue",
    sections: [
      {
        title: "기본 정보",
        fields: [
          { name: "documentDate", label: "작성일", kind: "date", defaultValue: "$today" },
          { name: "daycareName", label: "어린이집·기관명", exampleValue: "담다어린이집" },
          { name: "venueName", label: "업체·견학지명", exampleValue: "담다 도예체험관" },
          { name: "venueContact", label: "현장 연락처", exampleValue: "032-000-0000" },
          { name: "venueAddress", label: "주소", exampleValue: "인천광역시 연수구 체험로 10", fullWidth: true },
          { name: "targetAge", label: "권장 연령", exampleValue: "만 4~5세" },
          { name: "participantRange", label: "가능 인원", exampleValue: "최소 10명 / 최대 30명" },
          { name: "duration", label: "소요시간", exampleValue: "약 90분" },
        ],
      },
      {
        title: "활동과 교육적 기대 경험",
        fields: [
          { name: "programFlow", label: "활동 순서", kind: "textarea", placeholder: "오리엔테이션 → 활동 → 정리 → 마무리", exampleValue: "안전 안내(10분) → 흙 탐색(15분) → 도자기 만들기(45분) → 작품 소개와 정리(20분)", fullWidth: true },
          { name: "childrenActivities", label: "아이들이 하는 활동", kind: "textarea", placeholder: "아이들이 직접 관찰하고 수행하는 활동", exampleValue: "흙의 촉감을 탐색하고 손으로 누르기·밀기·붙이기를 하며 자신만의 그릇을 만듭니다.", fullWidth: true },
          { name: "educationGoals", label: "교육 목적", kind: "textarea", placeholder: "교육 목표", exampleValue: "재료의 성질을 탐색하고 생각을 조형 활동으로 표현합니다.", fullWidth: true },
          { name: "developmentAreas", label: "관련 발달 영역", placeholder: "예: 소근육, 오감, 창의력, 사회성", exampleValue: "소근육 · 오감·감각 · 창의적 표현 · 집중력", fullWidth: true },
          { name: "expectedBenefits", label: "기대 경험", kind: "textarea", placeholder: "결과를 보장하기보다 지원되는 경험을 작성하세요.", exampleValue: "손의 힘을 조절하고 다양한 촉감을 경험하며 자신의 생각을 자유롭게 표현하도록 지원합니다.", fullWidth: true },
        ],
      },
      {
        title: "준비와 현장 운영",
        fields: [
          { name: "teacherSupplies", label: "교사 준비물", kind: "textarea", exampleValue: "원아 명단, 비상연락망, 구급가방" },
          { name: "childSupplies", label: "원아 준비물", kind: "textarea", exampleValue: "활동하기 편한 복장, 개인 물병" },
          { name: "providedSupplies", label: "업체 제공 물품", kind: "textarea", exampleValue: "흙, 도구, 앞치마, 작품 포장" },
          { name: "transportation", label: "이동·버스 안내", kind: "textarea", exampleValue: "대형버스 진입 가능 / 입구 앞 승하차 / 주차 1대 가능" },
          { name: "mealInfo", label: "식사·간식", kind: "textarea", exampleValue: "실내 식사 공간 있음 / 도시락 지참 가능" },
          { name: "restroomInfo", label: "화장실·접근성", kind: "textarea", exampleValue: "유아용 화장실 있음 / 1층 출입 가능" },
          { name: "rainPlan", label: "우천 시 계획", kind: "textarea", exampleValue: "전 과정 실내 운영으로 우천 시에도 진행합니다." },
          { name: "safetyNotes", label: "안전·주의사항", kind: "textarea", exampleValue: "도구 사용 전 안전교육을 진행하며 교사 1인당 원아 인솔 범위를 확인합니다.", fullWidth: true },
          { name: "emergencyContact", label: "비상 연락처", exampleValue: "현장 담당자 010-0000-0000" },
        ],
      },
    ],
  },
  {
    type: "safety-education",
    title: "현장체험 안전교육지",
    shortTitle: "안전교육지",
    description: "체험 전 원아 안전교육 내용과 교사의 실시 기록을 함께 남길 수 있습니다.",
    downloadName: "현장체험_안전교육지",
    accent: "rose",
    sections: [
      {
        title: "교육 개요",
        fields: [
          { name: "daycareName", label: "어린이집·기관명", exampleValue: "담다어린이집" },
          { name: "className", label: "반명", exampleValue: "햇살반" },
          { name: "educationDate", label: "교육일", kind: "date", defaultValue: "$today" },
          { name: "educationTime", label: "교육시간", exampleValue: "10:00~10:30" },
          { name: "targetAge", label: "대상 연령", exampleValue: "만 4세" },
          { name: "attendanceCount", label: "참여 인원", kind: "number", exampleValue: "18" },
          { name: "instructor", label: "담당 교사", exampleValue: "김담다" },
          { name: "safetyCategory", label: "안전교육 영역", kind: "select", options: ["교통안전", "실종·유괴 예방", "생활안전", "감염병·보건위생", "재난대비", "성폭력·아동학대 예방", "복합 안전교육"], exampleValue: "복합 안전교육" },
        ],
      },
      {
        title: "교육 계획",
        fields: [
          { name: "topic", label: "교육 주제", exampleValue: "즐겁고 안전한 현장체험 약속", fullWidth: true },
          { name: "goals", label: "교육 목표", kind: "textarea", exampleValue: "이동과 체험 중 지켜야 할 약속을 알고 위급한 상황에서 교사에게 도움을 요청할 수 있습니다.", fullWidth: true },
          { name: "method", label: "교육 방법", kind: "textarea", exampleValue: "그림자료 이야기 나누기, 안전 행동 시범, 역할놀이" },
          { name: "materials", label: "교육 자료", kind: "textarea", exampleValue: "안전 약속 그림카드, 이름표, 비상연락 카드" },
        ],
      },
      {
        title: "안전 약속",
        fields: [
          { name: "transportSafety", label: "이동·버스 안전", kind: "textarea", exampleValue: "안전벨트를 착용하고 버스가 완전히 멈춘 뒤 교사의 안내에 따라 이동합니다.", fullWidth: true },
          { name: "lostPrevention", label: "실종 예방", kind: "textarea", exampleValue: "짝꿍과 함께 움직이며 길을 잃으면 그 자리에 멈춰 주변 선생님이나 안전요원에게 도움을 요청합니다.", fullWidth: true },
          { name: "onsiteRules", label: "현장 활동 안전", kind: "textarea", exampleValue: "도구와 전시물은 안내받은 방법으로 사용하고 뛰거나 혼자 다른 장소로 이동하지 않습니다.", fullWidth: true },
          { name: "healthHygiene", label: "위생·알레르기", kind: "textarea", exampleValue: "활동 전후 손을 씻고 음식은 교사의 확인 후 먹습니다. 몸이 불편하면 즉시 알립니다.", fullWidth: true },
          { name: "emergencyAction", label: "비상 시 행동", kind: "textarea", exampleValue: "교사의 지시를 듣고 정해진 집결 장소로 이동하며 친구를 밀거나 되돌아가지 않습니다.", fullWidth: true },
        ],
      },
      {
        title: "교육 평가와 기록",
        fields: [
          { name: "evaluation", label: "평가·관찰", kind: "textarea", placeholder: "원아의 이해와 참여 모습을 기록하세요.", exampleValue: "안전 약속 그림을 보고 필요한 행동을 말했으며 역할놀이에 적극적으로 참여했습니다.", fullWidth: true },
          { name: "followUp", label: "추후 지원", kind: "textarea", exampleValue: "체험 당일 출발 전 핵심 약속을 다시 확인합니다.", fullWidth: true },
        ],
      },
    ],
  },
  {
    type: "parent-education",
    title: "부모교육지",
    shortTitle: "부모교육지",
    description: "가정에서 3분 안에 읽고 바로 실천할 수 있는 한 장 부모교육 자료입니다.",
    downloadName: "부모교육지",
    accent: "violet",
    sections: [
      {
        title: "발행 정보",
        fields: [
          { name: "daycareName", label: "어린이집·기관명", exampleValue: "담다어린이집" },
          { name: "issueDate", label: "발행일", kind: "date", defaultValue: "$today" },
          { name: "audience", label: "대상", kind: "select", options: ["영아 부모", "유아 부모", "전체 부모"], exampleValue: "유아 부모" },
          { name: "contact", label: "문의", exampleValue: "담임교사 또는 원으로 문의해 주세요." },
        ],
      },
      {
        title: "이번 교육 주제",
        fields: [
          { name: "title", label: "제목", exampleValue: "아이의 감정을 먼저 읽어주세요", fullWidth: true },
          { name: "whyImportant", label: "왜 중요한가요?", kind: "textarea", exampleValue: "감정을 인정받은 아이는 자신의 마음을 말로 표현하고 상황에 맞는 행동을 배우기 쉬워집니다.", fullWidth: true },
          { name: "childBehaviors", label: "이렇게 보일 수 있어요", kind: "textarea", exampleValue: "뜻대로 되지 않을 때 울거나 소리를 지르고, 마음을 설명하기보다 행동으로 먼저 표현할 수 있습니다.", fullWidth: true },
        ],
      },
      {
        title: "가정에서 실천하기",
        fields: [
          { name: "parentActions", label: "부모 실천 3가지", kind: "textarea", exampleValue: "1. 행동보다 감정을 먼저 말해주세요.\n2. 짧고 분명한 한계를 알려주세요.\n3. 진정된 뒤 해결 방법을 함께 찾아주세요.", fullWidth: true },
          { name: "conversationExamples", label: "이렇게 말해보세요", kind: "textarea", exampleValue: "“더 놀고 싶었는데 끝나서 속상했구나. 속상해도 장난감을 던질 수는 없어. 같이 정리할 방법을 찾아보자.”", fullWidth: true },
          { name: "avoidResponses", label: "이런 반응은 줄여주세요", kind: "textarea", exampleValue: "감정을 무시하는 말, 긴 훈계, 다른 아이와 비교하는 말은 줄여주세요.", fullWidth: true },
          { name: "homeActivity", label: "이번 주 실천활동", kind: "textarea", exampleValue: "잠들기 전 오늘 느낀 감정을 한 가지씩 말하고 표정으로 표현해 보세요.", fullWidth: true },
          { name: "resources", label: "추가 안내", kind: "textarea", placeholder: "관련 책, 기관 또는 상담 안내", exampleValue: "지속적인 어려움이 있다면 담임교사와 가정·기관에서의 모습을 함께 나눠주세요.", fullWidth: true },
        ],
      },
    ],
  },
  {
    type: "family-letter",
    title: "체험학습 가정통신문·참여동의서",
    shortTitle: "가정통신문",
    description: "체험 일정과 준비사항을 안내하고 보호자 참여·촬영 동의까지 받을 수 있습니다.",
    downloadName: "체험학습_가정통신문_참여동의서",
    accent: "green",
    sections: [
      {
        title: "안내 기본 정보",
        fields: [
          { name: "daycareName", label: "어린이집·기관명", exampleValue: "담다어린이집" },
          { name: "className", label: "대상 반", exampleValue: "햇살반" },
          { name: "issueDate", label: "발행일", kind: "date", defaultValue: "$today" },
          { name: "responseDeadline", label: "회신 기한", kind: "date", exampleValue: "2026-09-08" },
          { name: "title", label: "제목", exampleValue: "도자기 만들기 현장체험 안내", fullWidth: true },
          { name: "greeting", label: "인사말", kind: "textarea", exampleValue: "안녕하세요. 아이들이 흙을 탐색하고 자신만의 작품을 만들어보는 현장체험을 진행합니다. 아래 내용을 확인하시고 참여 여부를 회신해 주세요.", fullWidth: true },
        ],
      },
      {
        title: "체험 일정",
        fields: [
          { name: "eventDate", label: "체험일", kind: "date", exampleValue: "2026-09-15" },
          { name: "departureTime", label: "출발 시간", kind: "time", exampleValue: "09:30" },
          { name: "arrivalTime", label: "도착 예정", kind: "time", exampleValue: "13:30" },
          { name: "venueName", label: "장소", exampleValue: "담다 도예체험관" },
          { name: "venueAddress", label: "주소", exampleValue: "인천광역시 연수구 체험로 10", fullWidth: true },
          { name: "objectives", label: "체험 목적", kind: "textarea", exampleValue: "흙의 성질을 탐색하고 생각을 조형 활동으로 표현합니다.", fullWidth: true },
          { name: "schedule", label: "주요 일정", kind: "textarea", exampleValue: "09:30 출발 → 10:00 안전교육 → 10:20 체험 → 12:00 점심 → 13:30 어린이집 도착", fullWidth: true },
        ],
      },
      {
        title: "준비와 비용 안내",
        fields: [
          { name: "cost", label: "참가비", exampleValue: "1인 25,000원" },
          { name: "paymentGuide", label: "납부 안내", exampleValue: "담다 플랫폼을 통해 결제 완료" },
          { name: "clothing", label: "복장", exampleValue: "활동하기 편하고 오염되어도 괜찮은 복장" },
          { name: "supplies", label: "준비물", exampleValue: "개인 물병, 모자" },
          { name: "mealAndAllergy", label: "식사·알레르기", kind: "textarea", exampleValue: "도시락은 원에서 준비합니다. 알레르기 또는 개별 식이사항은 회신란에 작성해 주세요.", fullWidth: true },
          { name: "transportation", label: "이동수단", exampleValue: "어린이집 통학버스" },
          { name: "rainPlan", label: "우천 시", exampleValue: "실내 프로그램으로 정상 진행" },
          { name: "cancelPolicy", label: "취소·변경", kind: "textarea", exampleValue: "기상 특보 또는 기관 사정으로 일정이 변경될 경우 별도로 안내드립니다.", fullWidth: true },
          { name: "emergencyContact", label: "비상 연락처", exampleValue: "어린이집 032-000-0000 / 현장 010-0000-0000", fullWidth: true },
        ],
      },
      {
        title: "보호자 회신",
        fields: [
          { name: "photoUsePurpose", label: "촬영·활용 범위", kind: "textarea", exampleValue: "원내 활동 기록과 보호자 공유용 알림장에 한해 사용합니다.", fullWidth: true },
          { name: "extraConsent", label: "추가 동의·확인사항", kind: "textarea", placeholder: "개인정보, 투약 등 필요한 확인사항", exampleValue: "체험 중 응급상황 발생 시 보호자에게 연락하고 필요한 응급조치를 시행하는 것에 동의합니다.", fullWidth: true },
        ],
      },
    ],
  },
];

export const FREE_FORM_DEFINITION_BY_TYPE = Object.fromEntries(
  FREE_FORM_DEFINITIONS.map((definition) => [definition.type, definition])
) as Record<FreeFormType, FreeFormDefinition>;

export function isFreeFormType(value: string): value is FreeFormType {
  return FREE_FORM_TYPES.includes(value as FreeFormType);
}

function localToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateValue(value: string | undefined, today: string) {
  return value === "$today" ? today : value || "";
}

export function getFreeFormInitialValues(type: FreeFormType, blank = false): FreeFormValues {
  const today = localToday();
  const definition = FREE_FORM_DEFINITION_BY_TYPE[type];
  return Object.fromEntries(
    definition.sections.flatMap((section) => section.fields).map((field) => [
      field.name,
      blank ? "" : dateValue(field.defaultValue, today),
    ])
  );
}

export function getFreeFormExampleValues(type: FreeFormType): FreeFormValues {
  const today = localToday();
  const definition = FREE_FORM_DEFINITION_BY_TYPE[type];
  return Object.fromEntries(
    definition.sections.flatMap((section) => section.fields).map((field) => [
      field.name,
      dateValue(field.exampleValue || field.defaultValue, today),
    ])
  );
}

function numeric(value: string | undefined) {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateFreeFormAmounts(values: FreeFormValues) {
  const participantCount = numeric(values.participantCount);
  const unitPrice = numeric(values.unitPrice);
  const optionAmount = numeric(values.optionAmount);
  const discountAmount = numeric(values.discountAmount);
  const subtotal = participantCount * unitPrice;
  const total = Math.max(0, subtotal + optionAmount - discountAmount);
  const refundAmount = numeric(values.refundAmount);
  return { participantCount, unitPrice, optionAmount, discountAmount, subtotal, total, refundAmount, paidTotal: Math.max(0, total - refundAmount) };
}

export function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function escapeHtml(value: string | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function htmlValue(value: string | undefined) {
  return escapeHtml(value).replaceAll("\n", "<br>") || "&nbsp;";
}

function consentHtml(type: FreeFormType) {
  if (type === "family-letter") {
    return `<section><h2>보호자 참여동의서</h2><table>
      <tr><th>체험 참여</th><td>□ 참여합니다 &nbsp;&nbsp;&nbsp; □ 참여하지 않습니다</td></tr>
      <tr><th>사진 촬영·활용</th><td>□ 동의합니다 &nbsp;&nbsp;&nbsp; □ 동의하지 않습니다</td></tr>
      <tr><th>알레르기·건강 특이사항</th><td style="height:48px">&nbsp;</td></tr>
      <tr><th>비상 연락처</th><td>&nbsp;</td></tr>
      <tr><th>보호자 확인</th><td>원아명: ____________________ &nbsp; 보호자명: ____________________ (서명)</td></tr>
    </table></section>`;
  }
  if (type === "safety-education") {
    return `<section><h2>교육 실시 확인</h2><table>
      <tr><th>담당 교사</th><td>&nbsp;</td><th>원장·책임자</th><td>&nbsp;</td></tr>
      <tr><th>특이사항</th><td colspan="3" style="height:48px">&nbsp;</td></tr>
    </table></section>`;
  }
  return "";
}

export function buildFreeFormDocumentHtml(type: FreeFormType, values: FreeFormValues) {
  const definition = FREE_FORM_DEFINITION_BY_TYPE[type];
  const amount = calculateFreeFormAmounts(values);
  const sections = definition.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><table>${section.fields.map((field) => `
    <tr><th>${escapeHtml(field.label)}</th><td>${htmlValue(values[field.name])}</td></tr>`).join("")}</table></section>`).join("");
  const amountHtml = type === "quotation" || type === "payment-statement" ? `<section><h2>금액 합계</h2><table>
    <tr><th>인원별 금액</th><td>${amount.participantCount.toLocaleString("ko-KR")}명 × ${formatWon(amount.unitPrice)} = ${formatWon(amount.subtotal)}</td></tr>
    <tr><th>옵션·추가금액</th><td>${formatWon(amount.optionAmount)}</td></tr>
    <tr><th>할인금액</th><td>-${formatWon(amount.discountAmount)}</td></tr>
    <tr class="total"><th>${type === "quotation" ? "최종 견적금액" : "최종 결제금액"}</th><td>${formatWon(type === "payment-statement" ? amount.paidTotal : amount.total)}</td></tr>
  </table></section>` : "";

  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(definition.title)}</title><style>
    @page { size: A4; margin: 16mm; } body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color:#222; font-size:10.5pt; line-height:1.55; }
    header { text-align:center; border-bottom:2px solid #222; padding-bottom:14px; margin-bottom:20px; } header p { color:#777; font-size:9pt; letter-spacing:2px; margin:0; } h1 { font-size:24pt; margin:6px 0 0; }
    section { margin:18px 0; page-break-inside:avoid; } h2 { font-size:12pt; margin:0 0 7px; padding-left:8px; border-left:4px solid #f8b737; }
    table { width:100%; border-collapse:collapse; } th, td { border:1px solid #bbb; padding:7px 9px; vertical-align:top; } th { width:25%; background:#f5f5f5; text-align:left; } td { min-height:22px; white-space:normal; }
    tr.total th, tr.total td { font-size:13pt; font-weight:bold; background:#fff8e8; } footer { border-top:1px solid #ccc; margin-top:24px; padding-top:8px; color:#777; font-size:8.5pt; text-align:center; }
  </style></head><body><header><p>DAMDA FREE DOCUMENT</p><h1>${escapeHtml(definition.title)}</h1></header>${sections}${amountHtml}${consentHtml(type)}<footer>담다 무료 어린이집 행정자료 · 입력 내용은 이용자가 확인 후 사용해 주세요.</footer></body></html>`;
}
