import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const owner = '11111111-1111-4111-8111-111111111111';
const vendor = '22222222-2222-4222-8222-222222222222';
const product = '33333333-3333-4333-8333-333333333333';
const admin = '44444444-4444-4444-8444-444444444444';
const sqlFile = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('prepare and cutover keep checkout available and preserve cancelled test history', async (t) => {
  const db = new PGlite();
  const role = async (name) => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.role',$1,false), set_config('request.jwt.claim.sub',$2,false)", [name, owner]);
    await db.exec(`SET ROLE ${name}`);
  };
  const reset = () => db.exec('RESET ROLE');
  const createOrder = async (id, day, multi = false) => {
    await reset();
    const items = [{
      productId: product, businessOwnerId: vendor, reservedDate: `2099-12-${String(day).padStart(2, '0')}`,
      participants: 1, totalAmount: multi ? 500 : 1000, options: [],
    }];
    if (multi) items.push({ ...items[0], reservedDate: `2100-01-${String(day).padStart(2, '0')}` });
    await db.query(`INSERT INTO public.payment_orders(order_id,daycare_id,items,reserver_info,payment_method,amount)
      VALUES($1,$2,$3,'{}','card',1000)`, [id, owner, JSON.stringify(items)]);
  };
  const legacyFinalize = async (id, tid) => {
    await role('authenticated');
    return (await db.query('SELECT public.finalize_secure_payment_order($1,$2,1000) result', [id, tid])).rows[0].result;
  };
  const verifiedFinalize = async (id, tid) => {
    await role('service_role');
    const evidence = {
      tid, orderId: id, amount: 1000, balanceAmt: 1000, currency: 'KRW', status: 'paid', payMethod: 'card',
      environment: 'production', merchantKeyHash: 'a'.repeat(64), responseHash: 'b'.repeat(64),
      paidAt: '2026-09-08T10:00:00+09:00',
    };
    return (await db.query('SELECT public.finalize_verified_payment($1,$2,$3,$4,$5,$6) result',
      [id, tid, owner, admin, 'admin', JSON.stringify(evidence)])).rows[0].result;
  };
  const legacyDefinition = async () => {
    await reset();
    return (await db.query(`SELECT pg_get_functiondef(oid) definition, proacl::text acl, proowner::regrole::text owner
      FROM pg_proc WHERE oid='public.finalize_secure_payment_order(text,text,integer)'::regprocedure`)).rows[0];
  };
  const cancelledSnapshot = async () => {
    await reset();
    return (await db.query(`SELECT
      (SELECT to_jsonb(o) FROM public.payment_orders o WHERE order_id='CANCELLED-TEST') order_record,
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.reservations r
        JOIN public.payment_orders o ON r.id=ANY(o.reservation_ids) WHERE o.order_id='CANCELLED-TEST') reservations,
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM public.payments p WHERE p.pg_tid='cancelled-test-tid') payments,
      (SELECT jsonb_agg(to_jsonb(n) ORDER BY n.recipient_type) FROM public.notification_logs n
        JOIN public.payment_orders o ON n.reference_id=ANY(o.reservation_ids) WHERE o.order_id='CANCELLED-TEST') notifications`)).rows[0];
  };

  try {
    await db.exec(await sqlFile('./fixture.sql'));
    // Exercise the actual vulnerable checkout function, not a simplified replacement.
    const legacySql = await sqlFile('../../supabase/migrations/20260905090100_lockdown_private_data_and_secure_checkout.sql');
    const start = legacySql.indexOf('CREATE OR REPLACE FUNCTION public.finalize_secure_payment_order(');
    const end = legacySql.indexOf('\n$$;', start) + '\n$$;'.length;
    assert.ok(start >= 0 && end > start, 'actual legacy finalizer can be extracted');
    await db.exec(`CREATE OR REPLACE FUNCTION public.is_daycare() RETURNS boolean LANGUAGE sql AS
      $$ SELECT auth.uid() IS NOT NULL $$;`);
    await db.exec(legacySql.slice(start, end));
    await db.exec(`REVOKE ALL ON FUNCTION public.finalize_secure_payment_order(text,text,integer) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION public.finalize_secure_payment_order(text,text,integer) TO authenticated;`);
    await db.query('INSERT INTO public.daycares VALUES($1)', [owner]);
    await db.query('INSERT INTO public.business_owners VALUES($1)', [vendor]);
    await db.query('INSERT INTO public.products(id,business_id,business_owner_id) VALUES($1,$2,$2)', [product, vendor]);
    await db.query('INSERT INTO public.admins VALUES($1,true)', [admin]);

    await createOrder('CANCELLED-TEST', 1);
    const cancelled = await legacyFinalize('CANCELLED-TEST', 'cancelled-test-tid');
    await reset();
    await db.exec(`UPDATE public.payment_orders SET status='cancelled' WHERE order_id='CANCELLED-TEST';
      UPDATE public.payments SET status='cancelled' WHERE pg_tid='cancelled-test-tid';`);
    await db.query(`UPDATE public.reservations SET status='cancelled',cancel_reason='Completed test cancellation',cancelled_at=now()
      WHERE id=$1`, [cancelled.reservationIds[0]]);
    await db.query(`INSERT INTO public.notification_logs(reference_id,recipient_type,notification_type,status)
      VALUES($1,'daycare','reservation_completed','sent')`, [cancelled.reservationIds[0]]);
    const historyBefore = await cancelledSnapshot();
    const legacyBefore = await legacyDefinition();

    await t.test('prepare retains legacy function and ACL and enables only the new approval claim', async () => {
      await db.exec(await sqlFile('../../supabase/migrations/20260908120000_verified_payment_boundary.sql'));
      assert.deepEqual(await legacyDefinition(), legacyBefore);
      assert.equal((await db.query('SELECT approvals_enabled FROM payment_private.configuration WHERE singleton')).rows[0].approvals_enabled, true);
      assert.deepEqual(await cancelledSnapshot(), historyBefore);
      assert.equal((await db.query(`SELECT has_function_privilege('authenticated',
        'public.finalize_verified_payment(text,text,uuid,uuid,text,jsonb)','EXECUTE') allowed`)).rows[0].allowed, false);
    });

    await t.test('legacy and verified checkout both materialize reservations during preparation', async () => {
      await createOrder('LEGACY-DURING-PREPARE', 2);
      const oldResult = await legacyFinalize('LEGACY-DURING-PREPARE', 'legacy-prepare-tid');
      assert.equal(oldResult.reservationIds.length, 1);
      await createOrder('VERIFIED-DURING-PREPARE', 3, true);
      const newResult = await verifiedFinalize('VERIFIED-DURING-PREPARE', 'verified-prepare-tid');
      assert.equal(newResult.reservationIds.length, 2);
      assert.equal((await verifiedFinalize('VERIFIED-DURING-PREPARE', 'verified-prepare-tid')).idempotent, true);
      await reset();
      assert.equal((await db.query(`SELECT count(*)::int count FROM public.payments
        WHERE pg_tid IN ('legacy-prepare-tid','verified-prepare-tid')`)).rows[0].count, 3);
    });

    await t.test('new creator uses catalog prices and binds snapshot before returning; preparation tampering is rejected', async () => {
      await reset();
      await db.query(`INSERT INTO reservation_holds(daycare_id,product_id,reserved_date) VALUES($1,$2,'2099-12-06')`,[owner,product]);
      await role('authenticated');
      const created = (await db.query('SELECT create_verified_payment_order($1,$2,$3) result',[
        JSON.stringify([{productId:product,reservedDate:'2099-12-06',participants:1,totalAmount:1,options:[]}]),
        JSON.stringify({name:'Fixture',phone:'01000000000'}),'card',
      ])).rows[0].result;
      assert.equal(created.amount,1000);
      await reset();
      assert.equal((await db.query('SELECT count(*)::int n FROM payment_private.managed_orders WHERE order_id=$1',[created.orderId])).rows[0].n,1);
      await db.query('UPDATE payment_orders SET amount=999 WHERE order_id=$1',[created.orderId]);
      await role('service_role');
      await db.query('SELECT register_payment_authentication($1,$2)',[created.orderId,'snapshot-tid']);
      await assert.rejects(db.query('SELECT claim_payment_approval($1,$2,$3,$4)',[created.orderId,'snapshot-tid',owner,999]),/snapshot mismatch/);
      await assert.rejects(verifiedFinalize(created.orderId,'snapshot-tid'),/snapshot mismatch/);
      await reset();
      assert.equal((await db.query("SELECT count(*)::int n FROM payments WHERE pg_tid='snapshot-tid'")).rows[0].n,0);
    });

    await t.test('unattested activation fails atomically and leaves existing finalization available', async () => {
      await reset();
      await assert.rejects(db.exec(await sqlFile('../../supabase/operations/payment-cutover-activate.sql')),/must be attested/);
      await db.exec('ROLLBACK');
      assert.deepEqual(await legacyDefinition(), legacyBefore);
      assert.equal((await db.query('SELECT approvals_enabled FROM payment_private.configuration WHERE singleton')).rows[0].approvals_enabled,true);
    });

    await t.test('cutover closes old finalization while the verified checkout remains enabled', async () => {
      await reset();
      // PGlite checks the resulting schema and transition behavior. Independent-session
      // locking and CREATE INDEX CONCURRENTLY behavior require the deployment rehearsal.
      await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS payments_nicepay_reservation_tid_unique
        ON public.payments(reservation_id,pg_tid) WHERE pg_provider='nicepay' AND pg_tid IS NOT NULL`);
      await db.query("SELECT set_config('damda.payment_server_revision','verified-v2',false), set_config('damda.payment_test_traffic_drained','true',false)");
      await db.exec(await sqlFile('../../supabase/operations/payment-cutover-activate.sql'));
      await db.exec('SELECT public.assert_payment_boundary()');
      assert.equal((await db.query('SELECT approvals_enabled FROM payment_private.configuration WHERE singleton')).rows[0].approvals_enabled, true);
      await createOrder('OLD-AFTER-CUTOVER', 4);
      for (const caller of ['authenticated', 'service_role']) {
        await role(caller);
        await assert.rejects(db.query('SELECT public.finalize_secure_payment_order($1,$2,1000)',
          ['OLD-AFTER-CUTOVER', 'old-after-cutover-tid']), /permission denied|verified server finalization/i);
      }
      await createOrder('NEW-AFTER-CUTOVER', 5, true);
      const result = await verifiedFinalize('NEW-AFTER-CUTOVER', 'new-after-cutover-tid');
      assert.equal(result.reservationIds.length, 2);
      assert.equal((await verifiedFinalize('NEW-AFTER-CUTOVER', 'new-after-cutover-tid')).idempotent, true);
      await reset();
      assert.equal((await db.query(`SELECT count(*)::int count FROM public.payments WHERE pg_tid='old-after-cutover-tid'`)).rows[0].count, 0);
      assert.equal((await db.query(`SELECT count(*)::int count FROM public.payments WHERE pg_tid='new-after-cutover-tid'`)).rows[0].count, 2);
    });

    await t.test('customer order creation and GET recovery work after activation without a new callback attempt', async () => {
      await reset();
      await db.query(`INSERT INTO reservation_holds(daycare_id,product_id,reserved_date) VALUES($1,$2,'2099-12-07')`,[owner,product]);
      await role('authenticated');
      const created = (await db.query('SELECT create_verified_payment_order($1,$2,$3) result',[
        JSON.stringify([{productId:product,reservedDate:'2099-12-07',participants:1,options:[]}]),
        JSON.stringify({name:'Fixture',phone:'01000000000'}),'card',
      ])).rows[0].result;
      await role('service_role');
      const receipt={tid:'new-customer-tid',orderId:created.orderId,amount:1000,balanceAmt:1000,currency:'KRW',status:'paid',payMethod:'card',
        environment:'production',merchantKeyHash:'a'.repeat(64),responseHash:'b'.repeat(64),paidAt:'2026-09-08T10:00:00+09:00'};
      const result=(await db.query('SELECT finalize_verified_payment($1,$2,$3,$4,$5,$6) result',
        [created.orderId,'new-customer-tid',owner,owner,'customer',JSON.stringify(receipt)])).rows[0].result;
      assert.equal(result.reservationIds.length,1);
      await reset();
      assert.equal((await db.query('SELECT count(*)::int n FROM payment_private.attempts WHERE order_id=$1',[created.orderId])).rows[0].n,0);
    });

    await t.test('cancelled legacy test rows and successful notification records are unchanged', async () => {
      assert.deepEqual(await cancelledSnapshot(), historyBefore);
      assert.equal((await db.query(`SELECT count(*)::int count FROM payment_private.verified_transactions
        WHERE tid='cancelled-test-tid'`)).rows[0].count, 0);
      assert.equal((await db.query(`SELECT count(*)::int count FROM payment_private.notification_outbox n
        JOIN public.payment_orders o ON n.reservation_id=ANY(o.reservation_ids)
        WHERE o.order_id='CANCELLED-TEST'`)).rows[0].count, 0);
    });
  } finally {
    await db.close();
  }
});
