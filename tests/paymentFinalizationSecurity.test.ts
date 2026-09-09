import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { paymentConfig, verifyAuthentication, verifyPaidTransaction, gatewayRequest } from "../src/lib/payments/nicepay.ts";
import { reconcilePayment } from "../src/lib/payments/finalize.ts";
import type { GatewayData, PaymentOrder } from "../src/lib/payments/nicepay.ts";

const config = { clientKey: "R1_fixture", secretKey: "test-only-secret", environment: "production" as const };
const order: PaymentOrder = { order_id: "ORDER1", daycare_id: "owner", amount: 1000, payment_method: "card", status: "pending", expires_at: "2099-01-01T00:00:00Z", pg_tid: null, reservation_ids: [] };
function transaction(changes: GatewayData = {}) {
  const data: GatewayData = { tid: "TID1", orderId: order.order_id, amount: 1000, balanceAmt: 1000,
    currency: "KRW", status: "paid", resultCode: "0000", payMethod: "card", paidAt: "2026-09-08T10:00:00+09:00",
    cancelledAt: "0", cancels: [], ediDate: "2026-09-08T10:00:01+09:00", ...changes };
  data.signature = createHash("sha256").update(`${data.tid}${data.amount}${data.ediDate}${config.secretKey}`).digest("hex");
  return data;
}
test("production configuration rejects sandbox, missing keys and browser/server merchant mismatch", () => {
  const env = { NICEPAY_CLIENT_KEY: "R1_fixture", NEXT_PUBLIC_NICEPAY_CLIENT_KEY: "R1_fixture", NICEPAY_SECRET_KEY: "test", NICEPAY_ENVIRONMENT: "production", NICEPAY_APPROVAL_MODEL: "server" };
  assert.equal(paymentConfig(env).environment, "production");
  for (const change of [{ NICEPAY_ENVIRONMENT: "sandbox" }, { NICEPAY_CLIENT_KEY: "S1_test" }, { NEXT_PUBLIC_NICEPAY_CLIENT_KEY: "R1_other" }, { NICEPAY_SECRET_KEY: "" }, { NICEPAY_APPROVAL_MODEL: "client" }]) {
    assert.throws(() => paymentConfig({ ...env, ...change }));
  }
});
test("callback signature, merchant and persisted amount are required", () => {
  const data = { orderId: order.order_id, tid: "TID1", authResultCode: "0000", clientId: config.clientKey, amount: "1000", authToken: "token", signature: "" };
  data.signature = createHash("sha256").update(`token${config.clientKey}1000${config.secretKey}`).digest("hex");
  verifyAuthentication(data, order, config);
  for (const change of [{ signature: "fake" }, { amount: "999" }, { clientId: "other" }, { orderId: "OTHER" }, { authToken: "tampered" }, { authResultCode: "9999" }]) {
    assert.throws(() => verifyAuthentication({ ...data, ...change }, order, config));
  }
});
for (const [name, changes] of Object.entries({ fakeTid: { tid: "fake" }, otherOrder: { orderId: "OTHER" }, wrongAmount: { amount: 999 }, currency: { currency: "USD" }, balance: { balanceAmt: 999 }, ready: { status: "ready" }, failed: { status: "failed" }, cancelled: { status: "cancelled" }, partial: { status: "partialCancelled" }, expired: { status: "expired" }, issuedVbank: { status: "ready", payMethod: "vbank", paidAt: "0" }, successCodeOnly: { status: undefined }, hiddenCancellation: { cancels: [{ amount: 1 }] }, cancelledTime: { cancelledAt: "2026-09-08T11:00:00Z" }, paymentMethod: { payMethod: "bank" } })) {
  test(`${name} cannot finalize despite HTTP/resultCode success`, () => assert.throws(() => verifyPaidTransaction(transaction(changes), order, "TID1", config)));
}
test("other merchant secret and tampered signature are rejected", () => {
  assert.throws(() => verifyPaidTransaction(transaction(), order, "TID1", { ...config, secretKey: "other-merchant" }));
  assert.throws(() => verifyPaidTransaction({ ...transaction(), signature: "00".repeat(32) }, order, "TID1", config));
  assert.equal(verifyPaidTransaction(transaction(), order, "TID1", config).amount, 1000);
});
test("timeout does not call DB finalization and preserves a review outcome", async () => {
  const calls: string[] = [];
  const result = await reconcilePayment({ order, tid: "TID1", actorId: "owner", source: "customer", config, allowApproval: true,
    rpc: async name => { calls.push(name); return { data: name === "claim_payment_approval", error: null }; },
    transport: async () => { throw new Error("timeout"); } });
  assert.equal(result.success, false);
  assert.equal(calls.includes("finalize_verified_payment"), false);
  assert.equal(calls.includes("record_payment_review"), true);
});
test("unowned request cannot reach privileged RPC or gateway", async () => {
  await assert.rejects(reconcilePayment({ order, tid: "TID1", actorId: "attacker", source: "customer", config, allowApproval: true,
    rpc: async () => { assert.fail("RPC reached"); }, transport: async () => { assert.fail("Gateway reached"); } }), /owner_mismatch/);
});
test("DB failure after approval recovers with GET only and never requests a second approval", async () => {
  let claimed = false, failed = false;
  const methods: string[] = [];
  const rpc = async (name: string) => {
    if (name === "claim_payment_approval") { const first = !claimed; claimed = true; return { data: first, error: null }; }
    if (name === "finalize_verified_payment" && !failed) { failed = true; return { data: null, error: "db outage" }; }
    return { data: { reservationIds: ["reservation"] }, error: null };
  };
  const transport: typeof fetch = async (_url, init) => { methods.push(init?.method || "GET"); return new Response(JSON.stringify(transaction()), { status: 200 }); };
  const input = { order, tid: "TID1", actorId: "owner", source: "customer" as const, config, allowApproval: true, rpc, transport };
  assert.equal((await reconcilePayment(input)).success, false);
  assert.equal((await reconcilePayment(input)).success, true);
  assert.deepEqual(methods, ["POST", "GET", "GET"]);
});
test("duplicate/delayed webhook never approves and follows latest gateway state", async () => {
  let writes = 0;
  const input = { order, tid: "TID1", actorId: null, source: "webhook" as const, config, allowApproval: false,
    rpc: async (name: string) => { if (name === "finalize_verified_payment") writes++; return { data: {}, error: null }; },
    transport: (async (_url, init) => { assert.equal(init?.method, "GET"); return new Response(JSON.stringify(transaction({ status: "cancelled" }))); }) as typeof fetch };
  assert.equal((await reconcilePayment(input)).success, false);
  assert.equal(writes, 0);
});

test("legacy transaction without a managed approval claim is queried without another charge", async () => {
  const methods: string[] = [];
  const result = await reconcilePayment({order,tid:"TID1",actorId:"owner",source:"customer",config,allowApproval:true,
    rpc:async (name,args)=>{
      if(name === "claim_payment_approval") {
        assert.equal(args.p_expected_amount,1000);
        return {data:false,error:null};
      }
      return {data:{orderId:order.order_id,reservationIds:["existing"],idempotent:true},error:null};
    },
    transport:async (_url,init)=>{methods.push(init?.method || "GET");return new Response(JSON.stringify(transaction()));},
  });
  assert.equal(result.success,true);
  assert.deepEqual(methods,["GET"]);
});
test("gateway uses fixed live origin, no redirects, bounded timeout and server amount", async () => {
  await gatewayRequest("TID1", config, 1000, async (url, init) => {
    assert.equal(new URL(String(url)).origin, "https://api.nicepay.co.kr");
    assert.equal(init?.redirect, "error"); assert.ok(init?.signal);
    assert.equal(JSON.parse(String(init?.body)).amount, 1000);
    return new Response(JSON.stringify(transaction()));
  });
});
