import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { reconcilePayment } from '../../src/lib/payments/finalize.ts';

const owner='11111111-1111-4111-8111-111111111111';
const vendor='22222222-2222-4222-8222-222222222222';
const product='33333333-3333-4333-8333-333333333333';
const admin='44444444-4444-4444-8444-444444444444';
const evidence = (id,tid) => ({tid,orderId:id,amount:1000,balanceAmt:1000,currency:'KRW',status:'paid',payMethod:'card',environment:'production',merchantKeyHash:'a'.repeat(64),responseHash:'b'.repeat(64),paidAt:'2026-09-08T10:00:00+09:00'});
let db;
test.before(async()=>{
  db = new PGlite();
  await db.exec(await readFile(new URL('./fixture.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20260908120000_verified_payment_boundary.sql',import.meta.url),'utf8'));
  // Hosted Supabase does not let postgres grant auth-schema access to this role.
  // Every integration below must work with that exact restriction in place.
  await db.exec('REVOKE USAGE ON SCHEMA auth FROM damda_payment_code');
  // CONCURRENTLY must be sent as its own command, including on a real PostgreSQL connection.
  // PGlite validates SQL semantics here; it does not prove live multi-session lock behavior.
  const indexSql = await readFile(new URL('../../supabase/operations/payment-index-create-online.sql',import.meta.url),'utf8');
  await db.exec(indexSql.match(/CREATE UNIQUE INDEX CONCURRENTLY[\s\S]*?;/)[0]);
  const dropSql = await readFile(new URL('../../supabase/operations/payment-index-drop-legacy-online.sql',import.meta.url),'utf8');
  await db.exec(dropSql.match(/DO \$\$[\s\S]*?END \$\$;/)[0]);
  await db.exec(dropSql.match(/DROP INDEX CONCURRENTLY[^;]+;/)[0]);
  await db.exec("SELECT set_config('damda.payment_server_revision','verified-v2',false), set_config('damda.payment_test_traffic_drained','true',false)");
  await db.exec(await readFile(new URL('../../supabase/operations/payment-cutover-activate.sql',import.meta.url),'utf8'));
  await db.exec(`INSERT INTO daycares VALUES('${owner}'); INSERT INTO business_owners VALUES('${vendor}');
    INSERT INTO products(id,business_id,business_owner_id) VALUES('${product}','${vendor}','${vendor}'); INSERT INTO admins VALUES('${admin}',true);`);
});
test.after(async()=>{ await db?.close(); });
const role=async(r)=>db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.role','${r}',false); SELECT set_config('request.jwt.claim.sub','${owner}',false); SET ROLE ${r};`);
const reset=async()=>db.exec('RESET ROLE');
async function order(id,day=1,multi=false,managed=true) {
  await reset();
  const items=[{productId:product,businessOwnerId:vendor,reservedDate:`2099-10-${String(day).padStart(2,'0')}`,participants:1,totalAmount:multi?500:1000,options:[]}];
  if(multi) items.push({...items[0],reservedDate:`2099-11-${String(day).padStart(2,'0')}`});
  await db.query(`INSERT INTO payment_orders(order_id,daycare_id,items,reserver_info,payment_method,amount) VALUES($1,$2,$3,'{}','card',1000)`,[id,owner,JSON.stringify(items)]);
  if(managed) await db.query('INSERT INTO payment_private.managed_orders(order_id,snapshot) SELECT order_id,payment_private.order_snapshot(o) FROM payment_orders o WHERE order_id=$1',[id]);
}
async function finalize(id,tid,source='admin',amount=1000) {
  await role('service_role');
  return (await db.query('SELECT public.finalize_verified_payment($1,$2,$3,$4,$5,$6) AS result',[id,tid,owner,source==='admin'?admin:owner,source,JSON.stringify({...evidence(id,tid),amount})])).rows[0].result;
}
test('effective ACL denies anonymous/authenticated, inherited grants detected',async()=>{
  await reset(); await db.exec('SELECT public.assert_payment_boundary()');
  for(const r of ['anon','authenticated']) {
    await role(r);
    await assert.rejects(db.exec(`SELECT finalize_secure_payment_order('x','fake',1000)`),/permission denied/);
    await assert.rejects(db.exec(`SELECT finalize_verified_payment('x','fake',null,null,'customer','{}')`),/permission denied/);
    await assert.rejects(db.exec(`SELECT * FROM payment_private.verified_transactions`),/permission denied/);
  }
  await reset();
  await db.exec('CREATE ROLE dangerous_inherited; GRANT EXECUTE ON FUNCTION public.finalize_verified_payment(text,text,uuid,uuid,text,jsonb) TO dangerous_inherited; GRANT dangerous_inherited TO authenticated');
  await assert.rejects(db.exec('SELECT public.assert_payment_boundary()'),/unsafe effective ACL/);
  await db.exec('REVOKE dangerous_inherited FROM authenticated; REVOKE EXECUTE ON FUNCTION public.finalize_verified_payment(text,text,uuid,uuid,text,jsonb) FROM dangerous_inherited');
});
test('direct table writes and a legacy SECURITY DEFINER wrapper cannot forge payment',async()=>{
  await order('DIRECT',1);
  await role('authenticated');
  await assert.rejects(db.exec(`UPDATE payment_orders SET amount=1 WHERE order_id='DIRECT'`),/permission denied/);
  await assert.rejects(db.exec(`INSERT INTO reservations DEFAULT VALUES`),/permission denied/);
  await assert.rejects(db.exec(`INSERT INTO payments DEFAULT VALUES`),/permission denied/);
  await reset();
  await db.exec(`CREATE FUNCTION public.legacy_forge() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ UPDATE public.payment_orders SET status='paid',pg_tid='fake' WHERE order_id='DIRECT' $$; GRANT EXECUTE ON FUNCTION public.legacy_forge() TO authenticated`);
  await role('authenticated');
  await assert.rejects(db.exec('SELECT public.legacy_forge()'),/server-only order mutation/);
  await reset(); assert.equal((await db.query('SELECT count(*)::int n FROM payments')).rows[0].n,0);
});
test('NULL JWT role fails closed even with function execute permission',async()=>{
  await reset(); await db.exec(`SELECT set_config('request.jwt.claim.role','',false)`);
  await assert.rejects(db.exec(`SELECT claim_payment_approval('DIRECT','nullrole','${owner}',1000)`),/server only/);
});
test('private JWT helpers match PostgREST claims fallback without auth-schema access',async()=>{
  await reset();
  assert.equal((await db.query("SELECT has_schema_privilege('damda_payment_code','auth','USAGE') allowed")).rows[0].allowed,false);
  await db.exec("SELECT set_config('request.jwt.claim.role','',false),set_config('request.jwt.claim.sub','',false)");
  await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'authenticated',sub:owner})]);
  await db.exec('SET ROLE damda_payment_code');
  const claims=(await db.query('SELECT payment_private.jwt_role() role,payment_private.jwt_uid() id')).rows[0];
  assert.deepEqual(claims,{role:'authenticated',id:owner});
  await assert.rejects(db.exec('SELECT auth.role()'),/permission denied for schema auth/);
  await reset();
  await db.exec("SELECT set_config('request.jwt.claims','',false)");
  for(const caller of ['anon','authenticated','service_role']) {
    await role(caller);
    await assert.rejects(db.exec('SELECT payment_private.jwt_role()'),/permission denied/);
  }
  await reset();
});
test('live JWT compatibility correction restores protected RPCs with the DDL guard active',async()=>{
  await reset();
  const oldFunctions=(await db.query(`SELECT pg_get_functiondef(p.oid) definition FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE p.proowner=(SELECT oid FROM pg_roles WHERE rolname='damda_payment_code')
      AND n.nspname IN ('payment_private','public') AND p.proname NOT IN ('jwt_role','jwt_uid')
      AND (position('payment_private.jwt_role()' in p.prosrc)>0 OR position('payment_private.jwt_uid()' in p.prosrc)>0)`)).rows;
  for(const {definition} of oldFunctions) {
    await db.exec(definition.replaceAll('payment_private.jwt_role()','auth.role()').replaceAll('payment_private.jwt_uid()','auth.uid()'));
  }
  await db.exec('DROP FUNCTION payment_private.jwt_role(),payment_private.jwt_uid()');
  await role('service_role');
  await assert.rejects(db.exec('SELECT public.claim_payment_notification()'),/permission denied for schema auth/);
  await reset();
  await db.exec(await readFile(new URL('../../supabase/operations/payment-jwt-schema-compatibility.sql',import.meta.url),'utf8'));
  await role('service_role');
  assert.equal((await db.query('SELECT public.claim_payment_notification() item')).rows[0].item,null);
  await reset();
  assert.equal((await db.query("SELECT has_schema_privilege('damda_payment_code','auth','USAGE') allowed")).rows[0].allowed,false);
  assert.equal((await db.query("SELECT has_schema_privilege('damda_payment_code','public','CREATE') allowed")).rows[0].allowed,false);
  await db.exec('SELECT public.assert_payment_boundary()');
});
test('durable approval claim is exactly once; different TID cannot reapprove same order',async()=>{
  await order('CLAIM',2); await role('service_role');
  await db.exec(`SELECT register_payment_authentication('CLAIM','claimtid'); SELECT register_payment_authentication('CLAIM','claimtid2')`);
  const values=await Promise.all(Array.from({length:10},()=>db.query(`SELECT claim_payment_approval('CLAIM','claimtid','${owner}',1000) ok`)));
  assert.equal(values.filter(x=>x.rows[0].ok).length,1);
  assert.equal((await db.query(`SELECT claim_payment_approval('CLAIM','claimtid2','${owner}',1000) ok`)).rows[0].ok,false);
});
test('legacy pending order never claims approval even with a signed callback',async()=>{
  await order('LEGACY',8,false,false); await role('service_role');
  await db.exec("SELECT register_payment_authentication('LEGACY','legacy-tid')");
  assert.equal((await db.query('SELECT claim_payment_approval($1,$2,$3,$4) ok',['LEGACY','legacy-tid',owner,1000])).rows[0].ok,false);
  await reset(); assert.equal((await db.query('SELECT approvals_enabled FROM payment_private.configuration')).rows[0].approvals_enabled,true);
});
test('approval amount is bound to the immutable snapshot even if caller read a stale value',async()=>{
  await order('STALE',10); await role('service_role');
  await db.exec("SELECT register_payment_authentication('STALE','stale-tid')");
  await assert.rejects(db.query('SELECT claim_payment_approval($1,$2,$3,$4)',['STALE','stale-tid',owner,999]),/approval amount mismatch/);
});

test('two-item order, repetitions and outbox produce exactly two reservation/payment lines',async()=>{
  await order('MULTI',3,true);
  const result=await finalize('MULTI','multi-tid'); assert.equal(result.reservationIds.length,2);
  for(let i=0;i<5;i++) assert.equal((await finalize('MULTI','multi-tid')).idempotent,true);
  await reset();
  assert.equal((await db.query(`SELECT count(*)::int n FROM payments WHERE pg_tid='multi-tid'`)).rows[0].n,2);
  assert.equal((await db.query(`SELECT count(*)::int n FROM payment_private.notification_outbox`)).rows[0].n,2);
});
test('same TID cannot pay another order, wrong amount cannot create side effects',async()=>{
  await order('OTHER',4);
  await assert.rejects(finalize('OTHER','multi-tid'),/already used|unique/);
  await assert.rejects(finalize('OTHER','wrong-amount','admin',999),/invalid verified evidence/);
  await reset();
  assert.equal((await db.query(`SELECT status FROM payment_orders WHERE order_id='OTHER'`)).rows[0].status,'pending');
});
test('DB failure rolls back all rows and outbox, retry needs no approval',async()=>{
  await order('ROLLBACK',5);
  await reset(); await db.exec(`CREATE FUNCTION public.fail_payment_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated storage outage'; END $$;
    CREATE TRIGGER test_failure BEFORE INSERT ON payments FOR EACH ROW EXECUTE FUNCTION public.fail_payment_test()`);
  await assert.rejects(finalize('ROLLBACK','rollback-tid'),/simulated storage outage/);
  await reset();
  assert.equal((await db.query(`SELECT count(*)::int n FROM reservations WHERE reserved_date='2099-10-05'`)).rows[0].n,0);
  assert.equal((await db.query(`SELECT count(*)::int n FROM payment_private.verified_transactions WHERE tid='rollback-tid'`)).rows[0].n,0);
  await db.exec('DROP TRIGGER test_failure ON payments');
  assert.equal((await finalize('ROLLBACK','rollback-tid')).idempotent,false);
});
test('expired paid order and unmanaged legacy attempt require review',async()=>{
  await reset();
  await db.query(`INSERT INTO payment_orders(order_id,daycare_id,items,reserver_info,payment_method,amount,expires_at) VALUES('EXPIRED',$1,'[]','{}','card',1000,now()-interval '1 minute')`,[owner]);
  assert.equal((await finalize('EXPIRED','late-tid')).reviewRequired,true);
  await order('NOAUTH',6,false,false);
  assert.equal((await finalize('NOAUTH','noauth-tid','customer')).reviewRequired,true);
  await reset(); assert.equal((await db.query(`SELECT count(*)::int n FROM payment_private.verified_transactions WHERE tid IN ('late-tid','noauth-tid')`)).rows[0].n,0);
});
test('outbox claims and per-recipient delivery claims never repeat',async()=>{
  await role('service_role');
  const item=(await db.query('SELECT claim_payment_notification() item')).rows[0].item;
  const claim=()=>db.query('SELECT claim_payment_notification($1,$2) ok',[item.reservationId,'daycare']);
  assert.equal((await claim()).rows[0].ok,true);
  assert.equal((await claim()).rows[0].ok,false);
  await db.query('SELECT finish_payment_notification($1,false)',[item.reservationId]);
  await reset(); assert.equal((await db.query('SELECT state FROM payment_private.notification_outbox WHERE reservation_id=$1',[item.reservationId])).rows[0].state,'review');
});
test('DDL regression guard rejects PUBLIC regrant and unsafe overload',async()=>{
  await reset();
  await assert.rejects(db.exec('GRANT EXECUTE ON FUNCTION public.finalize_verified_payment(text,text,uuid,uuid,text,jsonb) TO PUBLIC'),/unsafe effective ACL/);
  await assert.rejects(db.exec(`CREATE FUNCTION public.finalize_secure_payment_order(text) RETURNS void LANGUAGE sql AS $$ SELECT $$`),/unsafe effective ACL/);
  await assert.rejects(db.exec('ALTER TABLE public.payments DISABLE TRIGGER z_payment_boundary'),/trigger missing or disabled/);
  await db.exec('SELECT public.assert_payment_boundary()');
});
test('browser roles cannot forge or erase trusted notification logs; service delivery still writes',async()=>{
  await role('service_role');
  const reference='77777777-7777-4777-8777-777777777777';
  await db.query(`INSERT INTO public.notification_logs(reference_id,recipient_type,notification_type,status)
    VALUES($1,'daycare','reservation_completed','sent')`,[reference]);
  for(const caller of ['anon','authenticated']) {
    await role(caller);
    await assert.rejects(db.query(`INSERT INTO public.notification_logs(reference_id,recipient_type,notification_type,status)
      VALUES($1,'business','new_reservation','sent')`,[reference]),/permission denied/);
    await assert.rejects(db.query('UPDATE public.notification_logs SET status=$1 WHERE reference_id=$2',['failed',reference]),/permission denied/);
    await assert.rejects(db.query('DELETE FROM public.notification_logs WHERE reference_id=$1',[reference]),/permission denied/);
    await assert.rejects(db.exec('TRUNCATE public.notification_logs'),/permission denied/);
    assert.equal((await db.query('SELECT status FROM public.notification_logs WHERE reference_id=$1',[reference])).rows[0].status,'sent');
  }
  await reset();
  await assert.rejects(db.exec('GRANT INSERT ON public.notification_logs TO authenticated'),/unsafe effective table privilege/);
  await assert.rejects(db.exec('GRANT UPDATE(status) ON public.notification_logs TO anon'),/unsafe effective table privilege/);
  await db.exec('SELECT public.assert_payment_boundary()');
});
test('dedicated function-owner default ACL keeps future private helpers closed',async()=>{
  await reset(); await db.exec('SET ROLE damda_payment_code');
  await db.exec(`CREATE FUNCTION payment_private.future_helper() RETURNS integer LANGUAGE sql SET search_path=pg_catalog,pg_temp AS $$ SELECT 1 $$`);
  await reset();
  assert.equal((await db.query(`SELECT has_function_privilege('authenticated','payment_private.future_helper()','EXECUTE') allowed`)).rows[0].allowed,false);
  await db.exec('DROP FUNCTION payment_private.future_helper()');
});
test('existing reservation business/auto-confirm triggers work with least-privilege owner',async()=>{
  await reset();
  const sql = await readFile(new URL('../../supabase/migrations/20260824100000_add_multi_business_structure.sql',import.meta.url),'utf8');
  const start=sql.indexOf('CREATE OR REPLACE FUNCTION public.set_reservation_business()');
  const end=sql.indexOf('-- New settlements',start);
  await db.exec(sql.slice(start,end));
  await db.exec(await readFile(new URL('../../supabase/migrations/20260804141000_auto_confirm_business_reservations.sql',import.meta.url),'utf8'));
  await order('TRIGGERS',7);
  const result=await finalize('TRIGGERS','trigger-tid');
  await reset();
  assert.equal((await db.query('SELECT business_id FROM reservations WHERE id=$1',[result.reservationIds[0]])).rows[0].business_id,vendor);
});
test('settlement requires verified completed sales, unresolved gateway review blocks it',async()=>{
  await reset();
  await db.exec("SELECT set_config('damda.payment_settlement_audit_complete','true',false)");
  await db.exec(await readFile(new URL('../../supabase/operations/payment-settlement-policy-optional.sql',import.meta.url),'utf8'));
  await role('service_role');
  await db.exec(`UPDATE reservations SET status='completed' WHERE reserved_date='2099-10-07'`);
  await reset();
  await db.exec(`INSERT INTO settlements(business_owner_id,settlement_period_start,settlement_period_end,total_sales,settlement_amount) VALUES('${vendor}','2099-10-07','2099-10-07',1000,900)`);
  await assert.rejects(db.exec(`INSERT INTO settlements(business_owner_id,settlement_period_start,settlement_period_end,total_sales,settlement_amount) VALUES('${vendor}','2099-10-07','2099-10-07',2000,1900)`),/does not match/);
  await role('service_role');
  await db.exec(`SELECT record_payment_review('TRIGGERS','trigger-tid',null,'webhook','gateway_unavailable_or_mismatch')`);
  await reset();
  await assert.rejects(db.exec(`UPDATE settlements SET status='completed'`),/does not match/);
});
test('shared server pipeline with PostgreSQL: invalid GET writes audit only; repeats finalize once',async()=>{
  await order('PIPELINE',9,true); await role('service_role');
  await db.exec(`SELECT register_payment_authentication('PIPELINE','pipeline-tid')`);
  const stored=(await db.query(`SELECT * FROM payment_orders WHERE order_id='PIPELINE'`)).rows[0];
  const rpc=async(name,args)=>{
    assert.ok(['claim_payment_approval','record_payment_review','finalize_verified_payment'].includes(name));
    const values=Object.values(args).map(x=>x && typeof x==='object'?JSON.stringify(x):x);
    try { return {data:(await db.query(`SELECT public.${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) AS data`,values)).rows[0].data,error:null}; }
    catch(error){return {data:null,error};}
  };
  const config={clientKey:'R1_fixture',secretKey:'fixture-secret',environment:'production'};
  let state='ready'; let approvalCalls=0;
  const transport=async(_url,init)=>{
    if(init.method==='POST') approvalCalls++;
    const data={tid:'pipeline-tid',orderId:'PIPELINE',amount:1000,balanceAmt:1000,currency:'KRW',status:state,resultCode:'0000',payMethod:'card',paidAt:'2026-09-08T10:00:00+09:00',cancelledAt:'0',cancels:[],ediDate:'2026-09-08T10:00:01+09:00'};
    data.signature=createHash('sha256').update(`${data.tid}${data.amount}${data.ediDate}${config.secretKey}`).digest('hex');
    return new Response(JSON.stringify(data));
  };
  const input={order:stored,tid:'pipeline-tid',actorId:owner,source:'customer',config,rpc,allowApproval:true,transport};
  assert.equal((await reconcilePayment(input)).success,false);
  await reset();
  assert.equal((await db.query(`SELECT count(*)::int n FROM reservations WHERE reserved_date IN ('2099-10-09','2099-11-09')`)).rows[0].n,0);
  assert.equal((await db.query(`SELECT count(*)::int n FROM payment_private.verified_transactions WHERE order_id='PIPELINE'`)).rows[0].n,0);
  state='paid'; await role('service_role');
  const results=await Promise.all([reconcilePayment(input),reconcilePayment(input)]);
  assert.ok(results.every(x=>x.success)); assert.equal(approvalCalls,1);
  await reset();
  assert.equal((await db.query(`SELECT count(*)::int n FROM payments WHERE pg_tid='pipeline-tid'`)).rows[0].n,2);
});
