# 담다 개발(테스트) 환경 가이드

운영(production)과 분리된 개발 환경. **전부 무료 티어**로 구성. (2차개발 견적 9번 "개발 서버 분리")

## 구성 개요

```
                  운영(production)              개발(dev / preview)
프론트(Vercel)   main 브랜치                   develop 브랜치 (자동 프리뷰)
                 www.withdamda.kr              <project>-git-develop-everskys-projects.vercel.app
                       │                              │
                       ▼                              ▼
DB(Supabase)     damda                         damda-dev
                 eifpjjoawsgdmeeuzhin          tcdvvslgfapjhqlicadx
                 (서울 ap-northeast-2)          (서울 ap-northeast-2)
```

## DB

| | 운영 | 개발 |
|---|---|---|
| 프로젝트명 | damda | **damda-dev** |
| ref | eifpjjoawsgdmeeuzhin | **tcdvvslgfapjhqlicadx** |
| URL | https://eifpjjoawsgdmeeuzhin.supabase.co | https://tcdvvslgfapjhqlicadx.supabase.co |
| 플랜 | Free | Free |

- 스키마는 `supabase/migrations/`로 버전관리(운영과 1:1 동기화). 개발 DB는 운영 스키마를 그대로 복제함(2026-06-06 기준 테이블37·컬럼374·정책155·인덱스129 일치).
- **의도적 차이**: 알림톡 트리거 2개(`tr_reservation_alimtalk`, `tr_daycare_alimtalk`)는 개발 DB에서 제외. 개발에서 예약/회원 변경 시 운영 Edge Function으로 실제 알림톡이 발송되는 것을 방지하기 위함.

## 배포 / 브랜치 워크플로우

- `main` push → **운영** 배포 (www.withdamda.kr)
- `develop` push → **프리뷰** 자동 배포. URL: `<project>-git-develop-everskys-projects.vercel.app` (해당 브랜치 최신본 고정)
- 작업 흐름: feature 브랜치 → PR → `develop`(개발 DB로 검증) → `main`(운영 반영)

## 환경변수 분리 (Vercel)

Vercel 프로젝트의 **Preview** 환경변수를 개발 Supabase로 지정함 → `develop` 배포는 코드 변경 없이 자동으로 개발 DB를 바라봄.

| 앱 | 변수 | Preview 값 |
|---|---|---|
| damda-user (Next.js) | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 개발(tcdvvslg…) ✅ |
| damda-admin (Vite) | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 개발(tcdvvslg…) ✅ |
| damda-business (Vite) | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 개발(tcdvvslg…) ✅ |

> Production 환경변수는 그대로 운영 Supabase를 가리킴(변경 없음).
> 결제(NICEPAY)·카카오 키 등은 현재 Preview에서도 운영/공용 값 사용. 개발 전용 샌드박스 키가 필요하면 Preview 변수로 별도 추가.

## 무료 티어 주의점

- 무료 Supabase는 **7일 미사용 시 자동 일시정지**(대시보드 클릭 한 번으로 복구). 개발 기간 중엔 계속 사용하므로 사실상 무관.
- 무료 플랜은 **조직당 활성 프로젝트 2개**. 현재 운영 + 개발 = 2개로 한도 도달.
- 무료 용량: DB 500MB / 스토리지 1GB.

## 미해결 / 후속 작업

1. **개발 DB 테스트 데이터**: 현재 개발 DB는 스키마만 있고 데이터는 비어 있음. 필요 시 운영 데이터를 익명화해 시드하거나 어드민으로 입력.
2. **git ↔ 운영 정합성**: 1차 성능개선 코드는 운영에 CLI로 직접 배포됨. `develop`에 커밋돼 있으니, `main`에도 병합해 git과 운영을 일치시킬 것(미병합 시 추후 `main` push가 성능개선을 되돌릴 수 있음).

> 참고: damda-business의 로컬 Vercel 링크가 옛 projectId로 끊겨 있던 것을 `vercel link --project damda-business --scope team_7rn4sV6JA8uXng2JiVJXYXec`로 재연결함. 3개 앱 모두 Preview→개발 Supabase 설정 완료.
