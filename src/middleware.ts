import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 다음 경로에서는 미들웨어(인증 검사)를 실행하지 않는다:
     * - _next/static, _next/image (정적/이미지 최적화)
     * - 메타 파일: favicon.ico, robots.txt, sitemap.xml, manifest.webmanifest
     * - 정적 자산 확장자: 이미지/폰트/css/js/맵/문서
     * 불필요한 getUser() 호출과 함수 실행을 줄여 자산 응답을 빠르게 한다.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|woff|woff2|ttf|otf|txt|xml)$).*)",
  ],
};
