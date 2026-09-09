import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  metric: z.enum(["daily_visit", "partner_cta_click", "signup_cta_click"]),
  visitorId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("track_site_analytics", {
      p_metric_key: parsed.data.metric,
      p_visitor_id: parsed.data.visitorId,
    });

    if (error) {
      console.error("Analytics tracking failed", error.code);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
