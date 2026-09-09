import { gatewayRequest, verifyPaidTransaction } from "./nicepay.ts";
import type { NicepayConfig, PaymentOrder } from "./nicepay.ts";

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
export async function reconcilePayment(input: {
  order: PaymentOrder; tid: string; actorId: string | null; source: "customer" | "webhook" | "admin";
  config: NicepayConfig; rpc: Rpc; allowApproval: boolean; transport?: typeof fetch;
}) {
  const { order, tid, actorId, source, config, rpc, transport } = input;
  const review = async (reason: string) => {
    const { error } = await rpc("record_payment_review", { p_order_id: order.order_id, p_tid: tid,
      p_actor_id: actorId, p_source: source, p_reason: reason });
    if (error) console.error("payment_review_storage_failed");
    return { success: false, reviewRequired: true, paymentApproved: true,
      error: "결제 확인 대기 중입니다. 다시 결제하지 말고 거래 재확인 또는 고객센터 확인을 기다려주세요." };
  };
  if (source === "customer" && actorId !== order.daycare_id) throw new Error("owner_mismatch");
  if (input.allowApproval && source === "customer") {
    // Only atomically enrolled new orders may claim POST. Legacy TIDs are GET-only,
    // even when a delayed signed callback is received by the new server.
    const claim = await rpc("claim_payment_approval", { p_order_id: order.order_id, p_tid: tid,
      p_owner_id: actorId, p_expected_amount: order.amount });
    if (claim.error) return review("approval_claim_failed");
    if (claim.data === true) {
      try { await gatewayRequest(tid, config, order.amount, transport); }
      catch { /* Never reset the durable claim or repeat an uncertain POST. */ }
    }
  }
  let evidence;
  try {
    const transaction = await gatewayRequest(tid, config, undefined, transport);
    evidence = verifyPaidTransaction(transaction, order, tid, config);
  } catch { return review("gateway_unavailable_or_mismatch"); }
  try {
    const { data, error } = await rpc("finalize_verified_payment", { p_order_id: order.order_id, p_tid: tid,
      p_owner_id: order.daycare_id, p_actor_id: actorId, p_source: source, p_evidence: evidence });
    if (error || !data) return review("verified_database_write_failed");
    if ((data as { reviewRequired?: boolean }).reviewRequired) return review("late_or_unbound_payment");
    return { success: true, data };
  } catch { return review("verified_database_write_failed"); }
}
