import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

// Invoke from a server scheduler after commit; never from checkout or a DB trigger.
export async function POST(request: NextRequest) {
  const expected = process.env.PAYMENT_WORKER_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!expected || !received || Buffer.byteLength(expected) !== Buffer.byteLength(received)
    || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return new Response(null, { status: 401 });
  const service = createServiceClient();
  const { data, error } = await service.rpc("claim_payment_notification");
  if (error) return new Response(null, { status: 503 });
  if (!data) return NextResponse.json({ processed: 0 });
  let success = false;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-alimtalk`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ event: "reservation_paid", reservation_id: data.reservationId }),
    });
    success = response.ok && (await response.json()).success === true;
  } catch { /* Unknown delivery: leave for review; do not resend automatically. */ }
  const completed = await service.rpc("finish_payment_notification", { p_reservation_id: data.reservationId, p_success: success });
  return NextResponse.json({ processed: 1, reviewRequired: !success || Boolean(completed.error) });
}
