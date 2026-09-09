import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { daycareName, contactPhone } = await request.json();
    if (typeof daycareName !== "string" || typeof contactPhone !== "string") {
      return NextResponse.json({ error: "입력 정보가 올바르지 않습니다." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("find_masked_daycare_email", {
      p_name: daycareName,
      p_phone: contactPhone,
    });

    if (error) {
      console.error("Find email lookup failed", error.code, error.message);
      return NextResponse.json({ error: "아이디 찾기 요청을 처리하지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ foundEmail: data || null });
  } catch {
    return NextResponse.json({ error: "아이디 찾기 요청을 처리하지 못했습니다." }, { status: 500 });
  }
}
