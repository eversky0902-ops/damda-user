import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { paymentConfig, verifyGatewaySignature } from "@/lib/payments/nicepay";
import { reconcilePayment } from "@/lib/payments/finalize";
import { forwardRefundWebhook } from "@/lib/payments/refund-webhook";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = paymentConfig();
    verifyGatewaySignature(body, config);
    if (body.status === "cancelled" || body.status === "partialCancelled") {
      return await forwardRefundWebhook(body);
    }
    const service = createServiceClient();
    const { data: order, error } = await service.from("payment_orders").select("*").eq("order_id", body.orderId).single();
    if (error || !order || body.amount !== order.amount) return new Response("Rejected", { status: 400 });
    const result = await reconcilePayment({ order, tid: body.tid, actorId: null, source: "webhook",
      config, rpc: (name, args) => service.rpc(name, args), allowApproval: false });
    return new Response(result.success ? "OK" : "Review pending", {
      status: result.success ? 200 : 503, headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
    });
  } catch { return new Response("Rejected", { status: 400 }); }
}
