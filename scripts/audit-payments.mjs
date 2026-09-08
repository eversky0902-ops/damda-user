import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Offline, read-only comparison. Input is a preserved DB snapshot plus a NICEPAY
// transaction export obtained via GET only. Never approves/cancels/refunds/pays out.
export function comparePayments(snapshot, transactions) {
  const gateway = new Map(transactions.map(t => [t.tid, t]));
  const groups = new Map(); const findings = [];
  for (const p of snapshot.payments) {
    if (p.pg_provider !== 'nicepay' || p.amount === 0) {
      findings.push({ paymentId: p.id, classification: 'manual_free_or_other_method_review' }); continue;
    }
    if (!p.pg_tid) { findings.push({ paymentId: p.id, classification: 'missing_tid_review' }); continue; }
    const list = groups.get(p.pg_tid) || []; list.push(p); groups.set(p.pg_tid, list);
  }
  for (const [tid, payments] of groups) {
    const orders = snapshot.orders.filter(o => o.pg_tid === tid || payments.some(p => o.reservation_ids?.includes(p.reservation_id)));
    const reasons = [];
    if (orders.length > 1) reasons.push('tid_linked_to_multiple_orders');
    if (orders.length === 0) reasons.push('order_link_missing');
    const tx = gateway.get(tid);
    if (!tx) reasons.push('gateway_record_not_in_export'); // Absence is not proof of non-existent transaction.
    else {
      if (tx.resultCode !== '0000') reasons.push('lookup_not_successful');
      if (orders.length === 1 && tx.orderId !== orders[0].order_id) reasons.push('order_mismatch');
      if (tx.amount !== payments.reduce((sum,p)=>sum+p.amount,0)) reasons.push('line_amount_sum_mismatch');
      if (orders.length === 1 && tx.amount !== orders[0].amount) reasons.push('order_amount_mismatch');
      if (tx.currency !== 'KRW') reasons.push('currency_mismatch');
      if (payments.some(p=>p.status==='paid') && (tx.status !== 'paid' || tx.balanceAmt !== tx.amount || (tx.cancels?.length || 0)>0)) reasons.push('paid_or_cancel_state_mismatch');
      if (payments.some(p=>p.status==='cancelled') && tx.status==='paid') reasons.push('local_cancel_gateway_paid');
    }
    findings.push({ tid, paymentIds: payments.map(p=>p.id), orderIds: orders.map(o=>o.order_id),
      classification: reasons.length ? 'requires_review_not_proof_of_abuse' : 'matched_export_not_live_attestation', reasons });
  }
  return findings;
}
export async function main(args) {
  const [snapshotPath,gatewayPath,outputPath] = args;
  if (!snapshotPath || !gatewayPath || !outputPath) throw new Error('Usage: node scripts/audit-payments.mjs DB-snapshot.json NICEPAY-export.json NEW-output-directory');
  const [snapshotBytes,gatewayBytes] = await Promise.all([readFile(snapshotPath),readFile(gatewayPath)]);
  const snapshot = JSON.parse(snapshotBytes), gateway = JSON.parse(gatewayBytes);
  if (!Array.isArray(snapshot.payments) || !Array.isArray(snapshot.orders) || !Array.isArray(gateway)) throw new Error('Invalid snapshot shape');
  const findings = comparePayments(snapshot,gateway);
  // Refuse to overwrite a previous audit or any source file.
  await mkdir(resolve(outputPath), { recursive: false });
  await writeFile(resolve(outputPath,'manifest.json'),JSON.stringify({ createdAt:new Date().toISOString(),
    inputSha256:{database:createHash('sha256').update(snapshotBytes).digest('hex'),nicepay:createHash('sha256').update(gatewayBytes).digest('hex')},
    limitations:['Offline exports only','Missing transaction is a review candidate, not confirmed abuse','No payment/data/notification mutation performed'] },null,2),{flag:'wx'});
  await writeFile(resolve(outputPath,'findings.json'),JSON.stringify(findings,null,2),{flag:'wx'});
  console.log(JSON.stringify({ records: findings.length, review: findings.filter(f=>f.classification.includes('review')).length }));
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(()=>{console.error('Audit failed; verify input schema and use a new output directory.');process.exitCode=1;});
}
