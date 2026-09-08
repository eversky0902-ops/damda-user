import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { paymentConfig, validIdentifiers } from "@/lib/payments/nicepay";
import { reconcilePayment } from "@/lib/payments/finalize";

const headers = { "Access-Control-Allow-Origin": "https://admin.withdamda.kr",
  "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "POST,OPTIONS", Vary: "Origin" };
export async function OPTIONS() { return new Response(null, { status: 204, headers }); }
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return NextResponse.json({ success: false }, { status: 401, headers });
    const service = createServiceClient();
    const { data: { user }, error: authError } = await service.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ success: false }, { status: 401, headers });
    const { data: admin } = await service.from("admins").select("id").eq("id", user.id).eq("is_active", true).single();
    if (!admin) return NextResponse.json({ success: false }, { status: 403, headers });
    const { orderId, tid } = await request.json();
    if (!validIdentifiers(orderId, tid)) return NextResponse.json({ success: false }, { status: 400, headers });
    const { data: order } = await service.from("payment_orders").select("*").eq("order_id", orderId).single();
    if (!order) return NextResponse.json({ success: false }, { status: 404, headers });
    const result = await reconcilePayment({ order, tid, actorId: user.id, source: "admin", config: paymentConfig(),
      rpc: (name, args) => service.rpc(name, args), allowApproval: false });
    return NextResponse.json(result, { status: result.success ? 200 : 202, headers });
  } catch { return NextResponse.json({ success: false, reviewRequired: true }, { status: 503, headers }); }
}
