import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { paymentConfig, verifyGatewaySignature } from "@/lib/payments/nicepay";
import { reconcilePayment } from "@/lib/payments/finalize";
import { forwardRefundWebhook } from "@/lib/payments/refund-webhook";

const webhookHeaders = { "Content-Type": "text/html", "Cache-Control": "no-store" };

function webhookOk() {
  return new Response("OK", { status: 200, headers: webhookHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    // NICEPAY sends an empty JSON object while validating a newly registered
    // endpoint. It carries no transaction data and is deliberately handled
    // before configuration/signature validation. Every event-shaped payload
    // continues through the strict signature and order verification below.
    if (body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length === 0) {
      return webhookOk();
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response("Rejected", { status: 400 });
    }
    const payload = body as Record<string, unknown>;
    const config = paymentConfig();
    verifyGatewaySignature(payload, config);
    if (payload.status === "cancelled" || payload.status === "partialCancelled") {
      return await forwardRefundWebhook(payload);
    }
    const service = createServiceClient();
    const { data: order, error } = await service.from("payment_orders").select("*").eq("order_id", payload.orderId).single();
    if (error || !order || payload.amount !== order.amount) return new Response("Rejected", { status: 400 });
    const result = await reconcilePayment({ order, tid: payload.tid as string, actorId: null, source: "webhook",
      config, rpc: (name, args) => service.rpc(name, args), allowApproval: false });
    return result.success
      ? webhookOk()
      : new Response("Review pending", { status: 503, headers: webhookHeaders });
  } catch { return new Response("Rejected", { status: 400 }); }
}
