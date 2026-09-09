# 결제 보안 운영 반영 결과 — 2026-09-08

사용자 승인: “운영 반영해줘 내가 실제 결제 테스트 진행해볼게”. 실제 결제·취소는 사용자가 수행한다. 이 작업은 PG 승인·취소·환불 API를 호출하지 않았다. 결제 접수 중단 설정은 사용하지 않았다.

## 1. 확인된 원인과 위험

운영 DB를 직접 확인한 결과, 배포 직전 구 `finalize_secure_payment_order(text,text,integer)`의 anon/authenticated 실행 권한은 이미 차단되어 있었다. 과거 점검의 “일반 회원에게 현재도 열려 있다”는 판단을 그대로 적용하지 않았다. 다만 구 서버의 독립적인 거래 상태·서명 검증, 직접 테이블 쓰기 및 다른 definer 경로의 방어, 중복 승인/알림 방지가 충분하지 않았다.

운영 대상은 Supabase `eifpjjoawsgdmeeuzhin`이다. 로컬 개발 DB 설정은 배포하지 않았다. 운영 NICEPAY Server 승인 방식과 기존 운영 공개 키를 유지하고, 서버가 실제 거래를 재조회해 확정하는 경로로 전환했다.

## 2. 반영 파일·함수·배포

| 대상 | 운영 반영 결과 |
|---|---|
| 메인 | `dpl_2xZppXeWs8XL8gfUWxK3Avtuftk5`, https://withdamda.kr |
| 어드민 | `dpl_BTL8M6sPuCgzfaY6i2X2hq3EWig1`, https://admin.withdamda.kr |
| 사업주 | 재배포 없음. 기존 사이트가 동일한 운영 DB의 결제·예약을 조회 |
| 서버 | order/callback/approve, 서명 webhook, 관리자 GET 재조회 복구, 인증된 알림 worker |
| DB 준비 | `supabase/migrations/20260908120000_verified_payment_boundary.sql` 명시 적용 |
| 인덱스 | 예약/TID 인덱스 CONCURRENTLY 생성 후 구 payments 전역 TID 인덱스 CONCURRENTLY 제거. 주문/TID 고유성 유지 |
| DB 차단 | `supabase/operations/payment-cutover-activate.sql` 적용, `assert_payment_boundary()` 통과 |
| 운영 호환 수정 | `supabase/operations/payment-jwt-schema-compatibility.sql` 적용 |
| 알림 | `send-alimtalk` paid 이벤트 인증·수신자 중복 claim 적용. 기존 취소 이벤트 유지 |
| 스케줄러 | `supabase/operations/payment-notification-schedule.sql`, 매분 신규 outbox 처리, Vault 인증 |

운영 메인의 기존 `e0cc289` 위에 결제 관련 런타임 파일 13개만 적용했다. 비결제 파일 347개 보존을 확인했다. 어드민은 최신 환불·수수료 배포 `4db767f` 위에 결제 복구 관련 파일 3개만 적용하고 나머지 152개를 보존했다. 전액환불 수수료 0원 정책을 유지한다.

공개 `withdamda.kr`은 정상 서비스하고, 이전 배포 고유 URL은 [Vercel Standard Protection](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)으로 보호했다. 검증용 CLI가 임시로 생성한 배포 보호 우회 토큰은 점검 출력에 나타나 폐기했으며 값은 이 문서에 기록하지 않았다. NICEPAY/Supabase 서버 비밀키는 출력하거나 저장소에 추가하지 않았다.

## 3. 테스트와 실제 운영 확인

- 결제 서버 검증 24개, SQL·운영 호환 회귀 32개, 알림 Edge 동작 7개: **63개 통과**.
- 어드민 최신 환불 대시보드 회귀 19개, TypeScript·대상 ESLint·Vite 빌드 통과.
- 메인 격리 소스 TypeScript, Vercel의 실제 Next.js 운영 빌드 통과. Edge Deno 타입 검사 통과.
- 운영 DB의 신규 함수 소유자/안전한 search_path, 실효 EXECUTE, 테이블/컬럼 DML, 보호 트리거 4개, 역할 상속을 검사했다. 최종 `assert_payment_boundary()` 재실행도 통과했다.
- 실제 신규 함수 역할로 필요한 테이블과 기존 예약 트리거의 조회 권한을 확인했다.
- 세 사이트 HTTP 200, 메인 빈 주문 400, 비인증 복구·worker 401, paid Edge 비인증 요청 403, 어드민 CORS 정상 확인.
- 알림 worker는 최초에 auth 스키마 접근 오류로 503을 반환했다. 오류를 로컬에서 재현하고 Supabase와 동일한 JWT 판별을 하는 비공개 helper로 수정했다. 이후 **18:47 및 18:48 KST HTTP 200 / `processed:0`**을 확인했다. 권한을 일반 사용자에게 다시 열지 않았다.
- 실제 새 버전의 결제→예약→알림→취소 E2E와 운영 다중 연결 동시성 부하 시험은 **미검증**이다. 사용자가 실제 결제 테스트를 진행한다. 로컬 모의 결과를 실제 PG 통과로 표시하지 않는다.

## 4. 기존 거래 보존·감사

배포 전후 행 해시를 비교한 결과 아래 기록이 모두 동일했다. 비교 시각은 18:48 KST이며 이후 사용자 신규 테스트 기록은 이 비교에 포함하지 않는다.

| 기록 | 배포 전 | 배포 후 | 결과 |
|---|---:|---:|---|
| 주문 | 4 | 4 | 모든 기존 행 동일 |
| 결제 | 2 | 2 | 모든 기존 행 동일 |
| 예약 | 2 | 2 | 모든 기존 행 동일 |
| 알림 로그 | 140 | 140 | 모든 기존 행 동일 |

기존 결제 2건은 DB에서 취소 상태였다. NICEPAY 실제 결제·취소 완료는 사용자 확인과 앞선 환불 작업의 별도 GET 검증 기록에 근거한다. 이 배포 작업에서 PG 조회나 상태 변경으로 재감사하지 않았다. 오래된 pending 주문, 기존 복구 거래, 기존 paid_at/알림은 수정·삭제·재생성하지 않았다.

관련 스냅샷은 작업 폴더 `.codex-temp/payment-production-before-20260908.json` 및 `payment-production-after-20260908.json`에 보존했다. 원본을 공개 저장소에 포함하지 않는다. 향후 대조용 읽기 전용 SQL과 오프라인 `scripts/audit-payments.mjs`를 준비했다. 불일치는 확인 대상으로 분류하며 악용으로 단정하지 않는다.

## 5. 완료 여부

| 항목 | 상태 |
|---|---|
| 서버·DB·어드민·알림 코드 수정 | 완료 |
| 관련 자동 테스트·빌드 | 완료 |
| 운영 서버·DB·Edge·스케줄러 반영 | 완료 |
| 운영 실효 권한·기존 기록 보존 확인 | 완료 |
| 새 버전 실제 결제·취소 테스트 | 사용자 진행 예정 |

승인 설정은 `approvals_enabled=true`, 보안 경계는 `boundary_activated=true`다. 운영 SQL은 파일별 명시 실행했으며 **일괄 `supabase db push`는 하지 않았다**. 운영 적용 이력은 이 문서와 스냅샷을 기준으로 대조하고, 다른 미적용 마이그레이션을 자동 실행하지 않는다.

## 6. 남은 확인과 복구 원칙

- NICEPAY 관리자 콘솔의 실제 webhook 등록·전달 여부는 미확인이다. 서버의 결제/취소 통합 webhook 경로는 배포했다. PG 관리자에서 직접 취소한 건의 자동 반영까지 완료됐다고 간주하지 않는다.
- 현재 환불 구현은 하나의 예약에 연결된 결제를 처리한다. 여러 예약을 한 번에 결제한 건의 자동 환불은 검토 대상으로 남는다. 먼저 기존과 같은 단일 상품 결제·취소를 확인한다.
- 알림은 매분 처리하며 불명확한 발송은 review에 남긴다. claim을 지우거나 과거 로그를 삭제해 재발송하지 않는다.
- 경계 활성화 이후 구 결제 서버로 단순 롤백하지 않는다. 현재 검증 경로를 유지하는 빌드로 복구하고, 구 RPC 권한 재개방·승인 claim 초기화·임의 재승인을 하지 않는다.
- GitHub 원격 `main` 동기화는 아직 완료하지 않았다. 자동 승인 검토가 별도 승인이 없는 `main` 쓰기를 거부해 어드민 push는 차단됐고, 메인 push는 시도하지 않았다. 운영에 사용한 소스·SQL·테스트·문서는 로컬 격리 커밋으로 보존했다. 원격 동기화에는 사용자의 별도 승인이 필요하며, 그전에는 과거 원격 코드가 운영에 자동 배포되지 않도록 주의한다.

사용자는 운영 페이지를 새로고침해 새 결제를 시작하고, 예약 표시·결제 1회 생성·취소 반영을 확인한다. 이상이 있으면 재결제하지 않고 해당 주문번호/TID로 조회·복구한다.
