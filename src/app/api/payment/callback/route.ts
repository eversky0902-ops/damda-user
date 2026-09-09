import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { paymentConfig, validIdentifiers, verifyAuthentication } from "@/lib/payments/nicepay";

// Cross-site gateway POST may lack the SameSite session. This endpoint only records
// signed authentication. The approve route independently authenticates the customer.
export async function POST(request: NextRequest) {
  try {
    const fields = Object.fromEntries(await request.formData());
    if (!validIdentifiers(fields.orderId, fields.tid)) throw new Error("invalid_callback");
    const service = createServiceClient();
    const { data: order, error } = await service.from("payment_orders").select("*").eq("order_id", fields.orderId).single();
    if (error || !order) throw new Error("unknown_order");
    verifyAuthentication(fields, order, paymentConfig());
    const registered = await service.rpc("register_payment_authentication", { p_order_id: fields.orderId, p_tid: fields.tid });
    if (registered.error) throw new Error("authentication_storage_failed");
    const params = new URLSearchParams({ authResultCode: "0000", tid: String(fields.tid), orderId: fields.orderId });
    const response = NextResponse.redirect(new URL(`/checkout/callback?${params}`, request.url), 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/checkout/callback?authResultCode=REVIEW", request.url), 303);
  }
}
