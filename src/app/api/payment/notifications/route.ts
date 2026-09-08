import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

const diagnosticReasons = new Set([
  "notification_unauthorized", "invalid_reservation_id", "payment_boundary_unavailable",
  "reservation_lookup_failed", "reservation_not_found", "reservation_relations_incomplete",
  "reservation_contacts_incomplete", "notification_delivery_review", "notification_internal_error",
]);

function workerSecret(request: NextRequest): string | null {
  const expected = process.env.PAYMENT_WORKER_SECRET;
  const received = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!expected || !received || Buffer.byteLength(expected) !== Buffer.byteLength(received)
    || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return null;
  return expected;
}

async function callNotificationEdge(secret: string, event: string, reservationId?: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-alimtalk`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ event, ...(reservationId ? { reservation_id: reservationId } : {}) }),
    });
    const body = await response.json().catch(() => null);
    const success = response.ok && body?.success === true
      && (event !== "payment_notification_health" || body.ready === true);
    const reason = success ? null
      : diagnosticReasons.has(body?.reason) ? body.reason as string
      : response.status === 401 || response.status === 403 ? "notification_unauthorized"
      : "notification_edge_failure";
    return { success, downstreamStatus: response.status, reason };
  } catch {
    return { success: false, downstreamStatus: null, reason: "notification_edge_unavailable" };
  }
}

// Authenticated diagnostics never claim work, send messages, or create delivery logs.
export async function GET(request: NextRequest) {
  const secret = workerSecret(request);
  if (!secret) return new Response(null, { status: 401 });
  const reservationId = request.nextUrl.searchParams.get("reservationId") ?? undefined;
  if (reservationId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservationId)) {
    return NextResponse.json({ ready: false, reason: "invalid_reservation_id" }, { status: 400 });
  }
  const result = await callNotificationEdge(secret, "payment_notification_health", reservationId);
  return NextResponse.json({ ready: result.success, downstreamStatus: result.downstreamStatus, reason: result.reason }, {
    status: result.success ? 200 : 503, headers: { "Cache-Control": "no-store" },
  });
}

// Invoke from a server scheduler after commit; never from checkout or a DB trigger.
export async function POST(request: NextRequest) {
  const secret = workerSecret(request);
  if (!secret) return new Response(null, { status: 401 });
  const service = createServiceClient();
  const { data, error } = await service.rpc("claim_payment_notification");
  if (error) return new Response(null, { status: 503 });
  if (!data) return NextResponse.json({ processed: 0 });
  const result = await callNotificationEdge(secret, "reservation_paid", data.reservationId);
  // Unknown delivery remains in review; never reset the outbox or recipient claims here.
  const completed = await service.rpc("finish_payment_notification", { p_reservation_id: data.reservationId, p_success: result.success });
  return NextResponse.json({
    processed: 1, reviewRequired: !result.success || Boolean(completed.error),
    downstreamStatus: result.downstreamStatus,
    reason: result.reason ?? (completed.error ? "notification_finish_failed" : null),
  });
}
