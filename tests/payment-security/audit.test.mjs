import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePayments } from '../../scripts/audit-payments.mjs';
test('audit treats multi-line transaction as one order and distinguishes unavailable exports from abuse',()=>{
  const snapshot={orders:[{order_id:'A',amount:1000,pg_tid:'T',reservation_ids:['r1','r2']}],payments:[
    {id:'p1',reservation_id:'r1',pg_provider:'nicepay',pg_tid:'T',amount:400,status:'paid'},
    {id:'p2',reservation_id:'r2',pg_provider:'nicepay',pg_tid:'T',amount:600,status:'paid'}]};
  const matched=comparePayments(snapshot,[{tid:'T',orderId:'A',amount:1000,balanceAmt:1000,currency:'KRW',status:'paid',resultCode:'0000'}]);
  assert.equal(matched.length,1); assert.deepEqual(matched[0].reasons,[]);
  const absent=comparePayments(snapshot,[])[0];
  assert.equal(absent.classification,'requires_review_not_proof_of_abuse');
  assert.deepEqual(absent.reasons,['gateway_record_not_in_export']);
});
test('audit flags duplicate cross-order TID, amount/cancellation mismatches and separates manual payments',()=>{
  const snapshot={orders:[{order_id:'A',amount:1000,pg_tid:'T'},{order_id:'B',amount:1000,pg_tid:'T'}],payments:[
    {id:'p',reservation_id:'r',pg_provider:'nicepay',pg_tid:'T',amount:1000,status:'paid'},
    {id:'manual',pg_provider:'manual',amount:1000,status:'paid'}]};
  const result=comparePayments(snapshot,[{tid:'T',orderId:'A',amount:999,balanceAmt:1,currency:'KRW',status:'partialCancelled',resultCode:'0000'}]);
  assert.equal(result[0].classification,'manual_free_or_other_method_review');
  assert.ok(result[1].reasons.includes('tid_linked_to_multiple_orders'));
  assert.ok(result[1].reasons.includes('line_amount_sum_mismatch'));
  assert.ok(result[1].reasons.includes('paid_or_cancel_state_mismatch'));
});
