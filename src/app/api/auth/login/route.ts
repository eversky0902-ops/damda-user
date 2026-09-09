import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "이메일과 비밀번호를 입력해주세요" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !authData.user) {
    console.error("Homepage login failed", error?.code, error?.message);
    return NextResponse.json(
      { error: "이메일 또는 비밀번호가 올바르지 않습니다" },
      { status: 401 }
    );
  }

  const { data: daycare } = await supabase
    .from("daycares")
    .select("status")
    .eq("id", authData.user.id)
    .single();

  if (!daycare) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "어린이집 정보를 찾을 수 없습니다" },
      { status: 403 }
    );
  }

  return NextResponse.json({ status: daycare.status });
}
