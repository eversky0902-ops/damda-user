import { createClient } from "@supabase/supabase-js";

/**
 * 쿠키/세션이 필요 없는 "공개 데이터" 전용 Supabase 클라이언트.
 *
 * - 인기상품, 배너, 카테고리, 추천리뷰, 팝업처럼 모든 방문자에게 동일하게 보이는
 *   anon 권한 데이터를 읽을 때 사용한다.
 * - cookies()/headers()를 호출하지 않으므로 next/cache 의 `unstable_cache` 안에서
 *   안전하게 사용할 수 있다. (쿠키를 읽는 server.ts 클라이언트는 동적이라 캐시 불가)
 */
export function createCacheClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
