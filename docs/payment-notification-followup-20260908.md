# 결제 알림 인증 및 예약 캘린더 후속 수정

2026-09-08 운영 결제 테스트에서 결제·예약은 정상 확정됐지만, 알림 worker가 Edge Function에서 HTTP 403으로 거절됐다. 해당 예약의 수신자 claim과 알림 로그는 모두 0건으로, 알리고 발송 요청 전에 실패했다. 기존 서비스 키 문자열을 서버 간 호출 인증에 사용한 경로를 수정했다.

## 변경 내용

- Next 알림 worker와 `send-alimtalk`의 결제 이벤트는 같은 `PAYMENT_WORKER_SECRET`으로 인증한다. 각 환경의 Supabase 서비스 키는 해당 서버의 DB 접근에만 사용한다.
- 이 전용 비밀값은 Vercel Production, Supabase Edge secrets, 스케줄러가 참조하는 Vault `damda_payment_worker_secret`에 동일하게 설정해야 한다. 값을 로그·저장소·공개 환경변수에 남기지 않는다.
- `reservation_paid`와 진단 이벤트 `payment_notification_health`는 비밀값 누락·불일치 및 수신자 변경 요청을 거부한다. 기존 결제 원장 검증과 수신자별 영구 claim은 유지한다.
- 인증된 `GET /api/payment/notifications?reservationId=<UUID>`는 운영 권한 경계와 실제 발송 경로의 예약·연락처 조회만 수행한다. 성공 응답은 `ready:true`, `downstreamStatus:200`, `reason:null`이다. 예약 ID를 생략하면 권한 경계만 확인한다.
- 진단 경로는 outbox/수신자 claim, 발송, 로그 쓰기를 수행하지 않는다. 실패 응답에는 제한된 원인 코드만 포함한다.
- 예약 캘린더의 `cancelled`와 `refunded` 항목은 회색, 상품명 취소선, 각각 `취소`·`환불 완료` 문구로 표시한다. 상세 내역 링크는 유지한다.

## 검증 및 운영 반영

- 결제 보안 회귀 테스트 76개 통과. Next TypeScript, 수정한 Next 파일의 ESLint, Deno 2.9.6 Edge 타입 검사 통과.
- Vercel 운영 환경에서 소스 빌드 성공 후 도메인 전환. Supabase Edge 인증 수정 반영. 결제 서비스 중단 없음.
- 19:30 KST, 실제 테스트 예약에 대한 진단에서 Next HTTP 200 / Edge HTTP 200 확인. 무인증 요청 HTTP 401 확인.
- 진단 전후 해당 예약은 `confirmed`, outbox는 `review`, 수신자 claim 0건, 해당 예약 알림 로그 0건을 유지했다. 전체 기존 알림 로그 140건도 변하지 않았다.
- 진단 성공은 서버 인증과 조회 성공을 뜻한다. 알리고 접수 및 수신자의 카카오톡 도착까지 검증한 결과는 아니다.

## 누락 알림 처리 및 복구 원칙

이번 실패 알림은 자동으로 재발송하지 않는다. 실제 발송 승인 후에도 예약이 유효한 결제·확정 상태이고, 검증된 결제 원장이 있으며, 수신자 claim과 발송 로그가 전혀 없음을 다시 확인해야 한다. 조건이 맞을 때에만 해당 outbox 한 건을 처리 대기로 전환한다. 기존 claim이나 로그를 삭제하는 복구는 하지 않는다.

알림 인증 문제를 되돌릴 때 일반 사용자 권한을 열거나 인증 검사를 제거하지 않는다. 전용 비밀값 일치 여부와 인증된 진단 결과를 먼저 확인한다. 결제 승인·취소·환불을 알림 복구 수단으로 사용하지 않는다.
