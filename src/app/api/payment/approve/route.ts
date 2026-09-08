import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { paymentConfig, validIdentifiers } from "@/lib/payments/nicepay";
import { reconcilePayment } from "@/lib/payments/finalize";

export async function POST(request: NextRequest) {
  try {
    const { tid, orderId } = await request.json();
    if (!validIdentifiers(orderId, tid)) return NextResponse.json({ success: false }, { status: 400 });
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });
    const service = createServiceClient();
    const { data: order, error } = await service.from("payment_orders")
      .select("order_id,daycare_id,amount,payment_method,status,expires_at,pg_tid,reservation_ids")
      .eq("order_id", orderId).eq("daycare_id", user.id).single();
    if (error || !order) return NextResponse.json({ success: false }, { status: 404 });
    const result = await reconcilePayment({ order, tid, actorId: user.id, source: "customer",
      config: paymentConfig(), rpc: (name, args) => service.rpc(name, args), allowApproval: true });
    return NextResponse.json(result, { status: result.success ? 200 : 202 });
  } catch {
    return NextResponse.json({ success: false, reviewRequired: true, paymentApproved: true,
      error: "결제 확인을 완료하지 못했습니다. 다시 결제하지 말고 확인을 기다려주세요." }, { status: 503 });
  }
}
