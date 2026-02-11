import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 로그인 없이 접근 가능한 공개 경로
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/partner",
  "/privacy",
  "/terms",
  "/find-email",
  "/find-password",
  "/reset-password",
];

function isPublicPath(pathname: string): boolean {
  // 정확히 일치하거나 하위 경로인 경우 허용
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 로그인하지 않은 사용자가 보호된 페이지에 접근하면 로그인 페이지로 리다이렉트
  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 로그인된 사용자가 로그인/회원가입 페이지에 접근하면 상태에 따라 리다이렉트
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const { data: daycare } = await supabase
      .from("daycares")
      .select("status")
      .eq("id", user.id)
      .single();

    if (daycare?.status === "approved") {
      return NextResponse.redirect(new URL("/home", request.url));
    } else if (daycare?.status === "rejected") {
      return NextResponse.redirect(new URL("/signup/rejected", request.url));
    } else if (daycare?.status === "revision_required") {
      return NextResponse.redirect(new URL("/signup/revision", request.url));
    } else {
      // pending 등
      return NextResponse.redirect(new URL("/signup/complete", request.url));
    }
  }

  return supabaseResponse;
}
