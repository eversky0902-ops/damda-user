import { createHash, timingSafeEqual } from "node:crypto";

// Contract: nicepayments/nicepay-manual api/{payment-window-server,status-transaction,hook}.md
export type NicepayConfig = { clientKey: string; secretKey: string; environment: "production" };
export type PaymentOrder = { order_id: string; daycare_id: string; amount: number; payment_method: string; status: string; expires_at: string; pg_tid: string | null; reservation_ids: string[] };
export type GatewayData = Record<string, unknown>;

export function paymentConfig(env: Record<string, string | undefined> = process.env): NicepayConfig {
  const clientKey = env.NICEPAY_CLIENT_KEY;
  const secretKey = env.NICEPAY_SECRET_KEY;
  // Explicit deployment attestation: verify the live merchant's Server/Basic key in NICEPAY console.
  // Do not infer merchant/environment from a made-up response field or from the TID.
  if (env.NICEPAY_ENVIRONMENT !== "production" || env.NICEPAY_APPROVAL_MODEL !== "server"
      || !clientKey || !/^R[12]_/.test(clientKey) || !secretKey
      || clientKey !== env.NEXT_PUBLIC_NICEPAY_CLIENT_KEY) throw new Error("payment_configuration_unverified");
  return { clientKey, secretKey, environment: "production" };
}

export function validIdentifiers(orderId: unknown, tid: unknown): orderId is string {
  return typeof orderId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(orderId)
    && typeof tid === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(tid);
}

function signatureMatches(signature: unknown, text: string) {
  if (typeof signature !== "string" || !/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, "hex"), createHash("sha256").update(text).digest());
}

export function verifyAuthentication(data: GatewayData, order: PaymentOrder, config: NicepayConfig) {
  if (!validIdentifiers(data.orderId, data.tid) || data.authResultCode !== "0000"
      || data.clientId !== config.clientKey || data.orderId !== order.order_id
      || String(data.amount) !== String(order.amount) || typeof data.authToken !== "string"
      || !data.authToken || data.authToken.length > 128
      || !signatureMatches(data.signature, `${data.authToken}${data.clientId}${data.amount}${config.secretKey}`)) {
    throw new Error("invalid_authentication");
  }
}

export function verifyGatewaySignature(data: GatewayData, config: NicepayConfig) {
  if (!validIdentifiers(data.orderId, data.tid) || !Number.isSafeInteger(data.amount)
      || typeof data.ediDate !== "string" || !Number.isFinite(Date.parse(data.ediDate))
      || !signatureMatches(data.signature, `${data.tid}${data.amount}${data.ediDate}${config.secretKey}`)) {
    throw new Error("invalid_gateway_signature");
  }
}

export function verifyPaidTransaction(data: GatewayData, order: PaymentOrder, tid: string, config: NicepayConfig) {
  verifyGatewaySignature(data, config);
  if (data.resultCode !== "0000" || data.status !== "paid" || data.tid !== tid
      || data.orderId !== order.order_id || data.amount !== order.amount || data.balanceAmt !== order.amount
      || data.currency !== "KRW" || data.payMethod !== order.payment_method
      || typeof data.paidAt !== "string" || !Number.isFinite(Date.parse(data.paidAt))
      || (data.cancelledAt !== "0" && data.cancelledAt !== 0)
      || (data.cancels != null && (!Array.isArray(data.cancels) || data.cancels.length !== 0))) {
    throw new Error("transaction_mismatch");
  }
  return {
    tid, orderId: order.order_id, amount: order.amount, currency: "KRW", status: "paid",
    balanceAmt: data.balanceAmt, payMethod: data.payMethod, paidAt: data.paidAt,
    environment: config.environment, merchantKeyHash: createHash("sha256").update(config.clientKey).digest("hex"),
    responseHash: createHash("sha256").update(JSON.stringify(data)).digest("hex"),
  };
}

export async function gatewayRequest(tid: string, config: NicepayConfig, amount?: number, transport = fetch): Promise<GatewayData> {
  const ediDate = new Date().toISOString();
  const signData = createHash("sha256").update(`${tid}${amount === undefined ? "" : amount}${ediDate}${config.secretKey}`).digest("hex");
  const url = new URL(`https://api.nicepay.co.kr/v1/payments/${encodeURIComponent(tid)}`);
  if (amount === undefined) { url.searchParams.set("ediDate", ediDate); url.searchParams.set("signData", signData); }
  const response = await transport(url, {
    method: amount === undefined ? "GET" : "POST", redirect: "error", cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${config.clientKey}:${config.secretKey}`).toString("base64")}` },
    ...(amount === undefined ? {} : { body: JSON.stringify({ amount, ediDate, signData }) }),
  });
  if (!response.ok) throw new Error("gateway_unavailable");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("gateway_invalid_response");
  return body as GatewayData;
}
