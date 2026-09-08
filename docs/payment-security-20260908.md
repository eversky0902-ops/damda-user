# 담다 결제 확정 권한 보완 — 2026-09-08

> **최신 운영 상태:** 2026-09-08 사용자 승인 후 운영 반영과 최종 권한 검증을 완료했다. 아래의 미실행/미확인 표기는 배포 전 계획 당시의 기록이다. 현재 완료 여부·호환 수정·남은 실제 결제 테스트는 [운영 반영 결과](payment-production-deployment-20260908.md)를 우선한다.

> **사용자 제약·현황 반영:** 이번 주 오픈이며 결제 중단은 허용되지 않는다. 고객 실거래는 아직 없고, 기존 운영 사이트에서 테스트용 실제 NICEPAY 결제·예약 연동·취소를 완료했다고 사용자가 확인했다. 테스트 기록은 보존한다. 이번 조정으로 일괄 SQL을 준비/온라인 인덱스/권한 차단으로 분리했고, 승인 기본값은 true로 변경했다. 중단용 운영 SQL은 실행문을 제거했다. 최신 실행 순서는 [결제 중단 없는 오픈 전 전환](payment-continuous-cutover-20260908.md)을 따른다. 운영 변경은 실행하지 않았다.

이 문서는 **로컬 구현 및 검증 보고서이며 운영 해결 완료 보고서가 아니다.** 운영 배포·권한 변경·데이터 수정·결제 승인·취소·환불·알림 발송을 실행하지 않았다. 이전 복구 거래와 복구 SQL은 변경하거나 실행하지 않았다.

## 1. 확인된 원인과 위험

### 확인한 사실

- 작업 규칙: 상위 `AGENTS.md`의 사용자 변경 보존, 관련 빌드/테스트, 운영 전 검토·승인 규칙을 적용했다. 세 주요 저장소 내부에서 별도의 AGENTS.md는 발견하지 못했다.
- `damda-user`, `damda-admin`, `damda-business` 모두 로컬 접근 가능하다. 기존 작업 트리 변경이 많으며 이번 변경에 포함시키거나 되돌리지 않았다. 작업 중 다른 변경도 추가된 것으로 보이며 해당 파일을 덮어쓰지 않았다.
- 세 저장소의 `.env.local`은 동일한 `tcdvvslgfapjhqlicadx.supabase.co`를 가리킨다. 기존 알림 SQL에는 다른 프로젝트 `eifpjjoawsgdmeeuzhin.supabase.co`가 지정되어 있다. **로컬 설정을 운영 설정으로 간주하지 않았다.** 로컬 메인 환경에 NICEPAY 키와 Supabase 서비스 키는 없다.
- `20260905090100_lockdown_private_data_and_secure_checkout.sql`은 `SECURITY DEFINER` 결제 확정 함수에 authenticated 실행권한을 부여한다. 함수는 PG 조회 없이 주문·금액·TID 입력을 근거로 확정한다.
- 작업 시작 당시 별도의 미추적 `20260906001000_lock_down_payment_finalizer.sql`과 수정 중인 approve API가 있었다. 전자는 서비스 역할 제한 초안, 후자는 NICEPAY 승인 POST 후 RPC 호출 구조다. 이를 보존·확장했다. 운영에 적용됐다는 증거는 없다.
- 기존 approve API는 `resultCode`, 주문번호, TID, 금액만 검사하고 `paid`, 잔액, 통화, 서명 검증 및 재조회 복구가 없었다. `auth.role() <> 'service_role'`은 NULL 처리도 안전하지 않았다.
- 기존 전역 `payments(pg_tid)` 고유 인덱스 초안은 한 주문에 여러 예약·결제 행이 생성되는 모델과 충돌한다. 새 구현은 주문/거래 수준에서 TID를 고유하게 만들고 동일 주문의 결제 행 분할을 유지한다.
- 메인 현재 경로: `/api/payment/order` → SDK → `/api/payment/callback` → 고객 콜백 페이지 → `/api/payment/approve` → 결제 확정 RPC. 현재 브라우저의 해당 RPC 직접 호출은 발견하지 못했지만 과거의 직접 예약/paid INSERT 서비스 함수가 남아 있었다. 이 함수는 호출을 거부하도록 변경했다.
- 어드민 `updatePaymentStatus`는 직접 payments UPDATE로 paid 상태를 만들 수 있었다. 해당 paid 전환을 막고 별도 인증·재조회 복구 UI/API를 추가했다. 기존 RLS에는 관리자 직접 UPDATE 정책이 있으므로 프론트 차단만으로는 충분하지 않다.
- 사업주 콘솔은 공통 reservations/payments/settlements를 읽으며 예약 완료 상태를 갱신한다. 새 DB 경계는 정상 paid→confirmed→completed 업무 전이는 유지하고 미결제→확정 전이를 차단한다.
- 기존 알림 Edge Function의 paid 이벤트 처리에는 자체 호출자 인증과 원자적 중복 방지가 없었다. 새 paid 이벤트 경로는 서버 인증·커밋 후 outbox·수신자별 영구 claim을 요구한다.

### 공식 연동 규격

코드가 사용하는 제품은 `pay.nicepay.co.kr/v1/js/`, 국내 NICEPAY v1 Server 승인 API다. 실제 상점에 발급된 승인 모델/키 유형은 아직 콘솔 확인이 필요하다.

- [NICEPAY Server 승인](https://github.com/nicepayments/nicepay-manual/blob/main/api/payment-window-server.md): 인증 콜백의 `amount`, `authToken`, `clientId`, `signature`를 검증한다. 기존의 추정 필드 `amt` 사용을 제거했다.
- [NICEPAY 거래 조회](https://github.com/nicepayments/nicepay-manual/blob/main/api/status-transaction.md): 고정 운영 호스트의 GET으로 실제 상태를 조회한다. `paid`, 전체 잔액, KRW, 결제수단, 거래·주문·금액 및 응답 서명을 확인한다.
- [NICEPAY 웹훅](https://github.com/nicepayments/nicepay-manual/blob/main/api/hook.md): 전문 서명을 먼저 확인하고 같은 조회/확정 로직을 사용한다. 완료 시 `text/html`의 `OK`를 반환한다.
- [NICEPAY 인증 방식](https://github.com/nicepayments/nicepay-manual/blob/main/common/api.md): 서버에 고정한 가맹점 Client/Secret Key로 Basic 인증한다. 조회 응답에 문서화되지 않은 `mid`, `isTest` 등의 필드를 만들어 쓰지 않았다. 운영 endpoint·운영 키·해당 secret으로 검증한 서명을 가맹점/환경의 근거로 삼는다.
- [Supabase Event Triggers](https://supabase.com/docs/guides/database/postgres/event-triggers): Supabase는 postgres 역할의 event trigger 생성을 지원한다고 명시한다. 실제 대상 인스턴스에서도 적용 권한을 확인해야 한다.

### 미확인

운영 배포 커밋·실제 함수 소유자/ACL/오버로드·상속 역할·최종 RLS·운영 NICEPAY 상점/키 모델·등록된 웹훅·스케줄러·실제 거래내역은 조회하지 못했다. 로컬에 psql/Docker나 연결된 Supabase 관리 도구가 없고 운영 인증 연결도 확인되지 않았다. 별도 remote-schema/작업 사본은 운영 최신본으로 간주하지 않았다. `process-refund`는 두 콘솔에서 호출하지만 해당 배포 구현은 연결되지 않아 미검증이다. 다른 스키마의 우회 함수나 운영에만 있는 복구 작업은 preflight 결과를 받아 추가 검토해야 한다.

운영이 초기 ACL/함수 그대로라면 임의 TID 확정 위험이 있다. 현재 운영에서도 악용 가능하다거나 실제 악용됐다고 확정하지 않는다.

## 2. 수정 파일·함수·마이그레이션

| 대상 | 변경 |
|---|---|
| `src/lib/payments/nicepay.ts` | 문서 기반 인증·응답 서명, 상태·금액·잔액·통화·수단 검증; 고정 live endpoint, redirect 거부, 12초 timeout |
| `src/lib/payments/finalize.ts` | 고객·웹훅·관리자 공통 처리; DB의 승인 claim이 true인 최초 고객 요청만 POST; 이후 항상 GET; 불명확한 결과는 확인 대기 |
| `src/app/api/payment/{order,callback,approve}/route.ts` | 고객 인증과 서비스 클라이언트 분리, 소유권 검사, 콜백 서버 저장, 검증된 확정 경로 |
| `src/app/api/payment/{webhook,reconcile,notifications}/route.ts` | 서명 웹훅, 실제 관리자 조회·감사 기반 GET 복구, 인증된 알림 worker |
| `src/lib/supabase/service.ts` | `server-only` 경계 |
| `src/app/(main)/checkout/callback/page.tsx` | 불명확한 결과에서 홀드를 해제하지 않고 재결제 대신 거래 재확인 안내 |
| `src/services/cartService.ts` | 사용되지 않는 직접 confirmed/paid 생성 함수 폐쇄 |
| `supabase/functions/send-alimtalk/index.ts` | paid 이벤트 서버 인증, test 수신자 금지, 수신자별 중복 claim, 실패 확인 대기 |
| 어드민 `src/components/payments/PaymentRecovery.tsx`, `src/pages/Payments/index.tsx`, `src/services/paymentService.ts` | 주문번호·TID 기반 복구 UI, 관리자 토큰 서버 검증, 직접 paid 변경 금지 |
| `supabase/migrations/20260908120000_verified_payment_boundary.sql` | 기존 경로를 유지하는 추가 준비: private 테이블/스냅샷, 새 주문/검증 함수, 전용 역할 |
| `supabase/operations/payment-cutover-activate.sql` | 검증 서버 전환 확인 후 구 RPC/테이블 우회 차단과 outbox 전환 |
| `supabase/operations/payment-index-*-online.sql` | 트랜잭션 밖에서 별도 온라인 인덱스 변경 |
| `supabase/operations/payment-settlement-policy-optional.sql` | 과거 거래 감사 후 별도 승인하는 정산 정책, 이번 오픈 필수 전환에서 제외 |
| 기존 미추적 `20260906001000_lock_down_payment_finalizer.sql` | 잘못된 전역 payments TID 인덱스 생성 제거. 이미 적용된 DB의 인덱스는 별도 온라인 인덱스 작업에서 제거 |
| `supabase/tests/payment_finalizer_role_smoke.sql` | 복구 거래에 함수를 호출하던 테스트를 순수 읽기 전용 카탈로그 검사로 교체 |

DB 준비는 기존 RPC를 보존하며, 별도 activate 시 기존 RPC를 거부 전용으로 남기고 `finalize_verified_payment`를 service_role에만 연다. 검증 근거, 승인 시도, 감사 이벤트, 알림 대기열은 비공개 스키마에 보관한다. 새 주문은 기존 서버 가격 계산과 private 스냅샷 등록을 한 트랜잭션으로 실행한다. 승인 claim/확정에서 스냅샷과 요청 금액을 대조한다. activate 시 일반 역할의 테이블 쓰기와 definer 래퍼 우회를 트리거로 막는다. 구 주문은 지연 콜백이 도착해도 POST claim을 얻지 못한다. 이미 paid인 구 주문은 GET 검증 후 기존 결과만 반환하고, pending 구 주문의 복구는 관리자 확인이 필요하다.

activate 이후 확정 함수는 예약·옵션·결제·주문·알림 대기열을 한 트랜잭션으로 저장한다. 준비 중에는 기존 알림 트리거를 유지한다. 주문 행 잠금, TID 잠금, 정렬된 일정 잠금, 주문/TID 고유 제약과 예약별 결제 제약을 사용한다. 실패 시 모두 롤백되며 다음 요청은 재결제 없이 거래 조회로 복구한다. 만료·미연결 거래는 자동 확정하지 않는다.

`SECURITY DEFINER`는 고객의 RLS와 분리된 원자적 저장에 필요하여 유지했다. 결제 함수 소유자는 로그인 불가 `damda_payment_code`, 검색 경로는 `pg_catalog, pg_temp`, 테이블은 스키마를 명시한다. 이 역할에 필요한 테이블 권한과 전용 RLS를 주며 클라이언트 역할에는 상속시키지 않는다. 기존 비결제 함수의 권한은 일괄 제거하지 않는다. 전용 역할의 향후 함수 기본 PUBLIC EXECUTE를 제거하고, 현재 ACL을 명시적으로 닫으며, 재GRANT/오버로드/소유자·search_path 변경은 카탈로그 assertion과 DDL event trigger로 검출한다. 역할 상속 변경 등 event trigger가 지원하지 않는 shared-object 변경은 assertion을 배포 검사에서 반드시 다시 실행한다.

새 승인은 `payment_private.configuration.approvals_enabled=true`로 시작하고 준비·차단 단계 모두 정상 주문 접수를 유지한다. 구 주문과 신규 managed 주문을 구분해 구 TID 재승인을 막는다. 전체 과거 미검증 거래 때문에 정산을 일괄 막는 정책은 별도 승인 SQL로 분리했다. 신규 paid 확정의 서버 검증/DB 방어는 필수이며 이 분리에 의해 완화되지 않는다. **과거 정상 거래나 테스트 거래를 자동 검증 처리·삭제·재발송하지 않았다.**

알림은 outbox commit 이후 worker가 claim한다. 네트워크 결과가 불명확하면 영구 claim을 유지하여 자동 중복 발송을 피한다. 제공자 idempotency 계약을 확인하지 못했으므로 장애 때 ‘정확히 한 번 도착’을 보장한다고 주장하지 않는다. `sending` 장기 체류/`review`는 별도 배송 로그 대조가 필요하며 claim 삭제 후 자동 재발송하면 안 된다.

## 3. 테스트 결과와 미검증 항목

실행 명령:

```text
node --experimental-strip-types --test tests/*.test.ts
node --test tests/payment-security/*.test.mjs
node node_modules/next/dist/bin/next build
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
```

이번 조정 후 메인 44개(결제 검증 24개 포함), PostgreSQL/감사/전환 28개로 **전체 72개가 통과**했다(Node test runner 집계, 전환 상위 테스트와 7개 하위 테스트 포함). PGlite 0.5.8을 테스트 폴더에 고정 설치했고 fixture에 준비 SQL과 별도 activate SQL을 실행했다. 실제 구 finalizer와 서버 가격 계산 함수를 포함하는 전환 테스트를 추가했다. 기존 상품→사업장 예약 매핑/자동 확정 트리거도 추가 로드해 검증했다. 공통 서버 처리와 실제 PostgreSQL 함수를 연결한 mock PG 통합시험도 포함한다. 문자열 정규식 검사만으로 보안을 통과 처리하지 않았다.

기존 SECURITY INVOKER 알림 함수가 제한된 pg_net 권한에서도 새 전용 역할로 실행되도록 필요한 schema/function/queue 권한을 추가했다. 실제 기존 알림 함수와 로컬 queue stub으로 예약 확정·요청 1건 적재를 검증했고, pg_net 의존성이 없을 때 준비 전체 롤백도 확인했다. 실제 외부 알림 발송/도착 시험은 아니다. 준비 중에는 기존 알림 함수 본문과 ACL을 변경하지 않는다.

이번 조정 후 메인 Next production build와 TypeScript 검사도 다시 통과했다. 변경한 order API·공통 결제 처리·결제 검증 테스트의 ESLint 검사도 오류 없이 통과했다.

새 환경에서는 `pnpm --dir tests/payment-security --ignore-workspace install --frozen-lockfile --ignore-scripts`로 격리된 테스트 의존성을 설치한다. `test:payment-security` 스크립트는 결제 검증 및 DB/감사 시험을 함께 실행한다(전체 메인 테스트와 중복 집계하지 않는다).

세 사이트의 TypeScript 및 production build가 통과했다. 어드민/사업주 Vite 빌드는 esbuild의 상위 디렉터리 접근 제한으로 첫 실행이 실패했고, 로컬 빌드 권한 확장 후 통과했다. pnpm 자동 설치가 기존 node_modules를 교체하려는 흐름은 사용하지 않고 설치된 빌더를 직접 실행했다. Next middleware 명명 경고 및 Vite bundle 크기 경고는 결제 범위 밖으로 남겼다.

| 요구 항목 | 검증 범위 | 남은 검증 |
|---|---|---|
| 1. 일반 역할 RPC 거부 | PostgreSQL effective ACL, 직접 실행 거부, NULL role 거부 | 운영/PostgREST HTTP 인증 |
| 2. 테이블·다른 RPC 우회 | 직접 쓰기 및 definer 래퍼 거부, 가격 변경 거부 | 운영 전체 함수·상속·RLS 인벤토리 |
| 3. 가짜 TID·불일치·다른 상점·테스트 | 서명/내용 검증 및 sandbox/키 불일치 거부 | 실제 NICEPAY 테스트 계정 계약 시험 |
| 4. 미완료·취소·부분취소 | 서명된 mock 응답별 거부 | 실 PG 상태별 응답 |
| 5. 정상 확정 1회 | 다중 상품 주문의 정확한 예약·결제 행 수 및 반복 결과 | 실제 승인과 hosted DB 통합 |
| 6. 중복/동시/알림 | 원자적 claim, TID 제약, 반복 확정·수신자 claim | PGlite는 한 엔진에서 요청을 직렬 처리하므로 독립 PostgreSQL 세션 경합·실제 발송은 미검증 |
| 7. timeout | 승인/조회 실패에서 확정 호출 없이 review | 실 네트워크 장애 주입 |
| 8. DB 실패 복구 | 원자 롤백 및 POST→GET→GET 복구 | 운영 장애 복구 연습 |
| 9. 위조/역순 웹훅 | 서명 변조 거부, 최신 GET 상태 기준, 웹훅에서 승인 미호출 | 공개 웹훅 HTTP·방화벽·재전송 계약 |
| 10. 세 사이트 일치 | 공통 DB 기록 기반, 빌드, 별도 정산 정책 DB 시험 | 세 로그인 세션으로 예약·결제·정산 E2E 확인 필요 |

운영에서 가짜 결제/예약을 만들지 않았다. DB fixture는 운영 전체 스키마 복제본이 아니며 실제 pg_net 발송이나 Deno Edge 런타임을 실행하지 않았다. Deno 배포 및 기존 process-refund 호환성도 staging 합격 조건이다.

## 4. 기존 거래 감사 준비

- `supabase/tests/payment-security/read-only-preflight.sql`: 함수 서명/소유자/effective ACL, 역할 상속, 테이블·컬럼 권한, RLS, 트리거/default ACL. BEGIN READ ONLY만 사용하며 결제 함수를 실행하지 않는다.
- `supabase/tests/payment-security/preserve-audit-snapshot.sql`: REPEATABLE READ / READ ONLY의 결제·주문 스냅샷. 별도로 기존 예약·알림·서버·NICEPAY 로그를 접근 제한 저장소에 먼저 보존해야 한다.
- `scripts/query-payment-audit.ts`: 보존한 스냅샷의 TID만 NICEPAY GET 조회. 승인·취소·환불·정산 API 호출이 없다. 실행하지 않았다.
- `scripts/audit-payments.mjs`: 보존한 DB JSON과 NICEPAY JSON 비교, 입력 SHA-256 manifest와 새로운 결과 디렉터리 생성. 기존 출력/원본을 덮어쓰지 않는다. 다중 상품의 동일 TID는 합산하며 여러 주문 재사용·금액/주문/취소 불일치를 구분한다. 수기·무상·타 수단은 별도 검토로 분류한다.

```text
node --experimental-strip-types scripts/query-payment-audit.ts preserved-db.json new-nicepay-export.json
node scripts/audit-payments.mjs preserved-db.json new-nicepay-export.json new-audit-directory
```

NICEPAY 입력은 거래조회 응답 배열이다. 오프라인 export 일치는 live 가맹점 검증 완료가 아니며, export에 없는 TID도 ‘존재하지 않는 거래/악용 확정’으로 단정하지 않는다. **실제 기존 거래 감사는 미실행이며 준비 상태다.** 이전 복구 1건·알림 2건은 사용자/기존 보고서의 기록이고 이번에 재검증했다고 표현하지 않는다.

현재 추적 파일 519개를 대상으로 embedded service-role JWT 및 공개 SECRET/SERVICE_ROLE 환경변수 참조를 검사한 범위에서는 발견이 없었다. 전체 Git 이력, 미연결 배포·로그·외부 secret 저장소의 무노출을 보증하지 않는다. 키가 발견되면 값을 출력하지 않고 위치만 기록하며 교체는 승인 후 진행한다.

## 5. 완료 여부

| 항목 | 상태 |
|---|---|
| 로컬 코드·DB 마이그레이션·감사 도구 | 구현 완료, 운영 적용 전 검토본 |
| 로컬 자동 테스트·세 사이트 빌드 | 위 범위 통과 |
| 독립 DB 동시성·실 PG·Edge·세 사이트 E2E | 미검증 |
| 기존 거래 실감사 | 준비 완료, 실행 전 |
| 운영 배포·실제 권한 검증 | **미실행 / 미완료** |

## 6. 결제 중단 없는 운영 적용 계획

운영 적용은 [분리한 실행 계획](payment-continuous-cutover-20260908.md)에 따른다. **결제 중단, 승인 설정 OFF, 신규 주문 RPC 폐쇄는 포함하지 않는다.** 준비 SQL은 기존 경로를 보존하고, 온라인 인덱스 작업 후 새 검증 서버로 전환한다. 구 테스트 요청이 처리됐고 새 서버가 실제 요청을 받고 있음을 확인한 다음 activate SQL로 취약 권한을 차단한다. 준비만 적용한 상태는 보안 해결 완료가 아니다.

실행 전에는 세 사이트의 실제 운영 프로젝트, 함수/RLS/마이그레이션 이력, NICEPAY Server/Basic 키 모델, 웹훅·스케줄러와 알림 목적지를 확인한다. 환경변수는 NICEPAY_CLIENT_KEY, NICEPAY_SECRET_KEY, NICEPAY_ENVIRONMENT=production, NICEPAY_APPROVAL_MODEL=server, SUPABASE_SERVICE_ROLE_KEY, PAYMENT_WORKER_SECRET이며 공개 SDK 키와 상점이 같아야 한다. payment_private는 exposed schemas에 추가하지 않는다.

새 버전의 실제 결제→예약→취소, 전체 스키마/Edge/process-refund, 독립 DB 연결의 잠금과 세 사이트 E2E가 합격해야 권한 차단을 진행한다. 기존 버전에서 완료한 실제 NICEPAY 시험을 새 버전 시험으로 간주하지 않는다. 구 TID는 재승인하지 않으며 확인이 불명확한 주문은 자동 취소·재발송·복구하지 않는다.

잠금 제한 초과나 activate 사전조건 실패는 해당 SQL 트랜잭션만 롤백한다. 구 취약 버전으로 되돌릴 필요가 없도록 같은 보안 DB와 호환되는 안정 서버 빌드를 미리 검증한다. 활성화 이후 구 finalizer 실행권한을 복구하거나 영구 claim을 지우지 않는다. 전체 미적용 migration을 일괄 push하면 기존 20260906001000 초안이 먼저 결제를 막을 수 있으므로 검토한 파일만 명시적으로 적용한다.

준비 중 기존 알림을 유지하고, activate 이후 신규 건은 outbox에서 대기한다. 기존 pg_net 요청/발송 기록을 확인한 뒤 새 Edge와 worker를 연결한다. 새 인증 Edge를 먼저 배포하여 기존 요청을 거부시키는 순서를 피한다. 세부 절차와 SQL 파일은 실행 계획에 명시했다.

**이번 로컬 조정은 완료했으나 운영 배포·권한 변경·추가 실제 결제 시험은 미실행이다.** 원래 요청과 프로젝트 AGENTS.md에 따라 실제 운영 적용은 최종 검토와 사용자 승인 후 진행한다.
