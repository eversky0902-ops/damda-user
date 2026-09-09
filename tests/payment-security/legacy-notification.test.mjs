import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const owner = '11111111-1111-4111-8111-111111111111';
const vendor = '22222222-2222-4222-8222-222222222222';
const product = '33333333-3333-4333-8333-333333333333';
const admin = '44444444-4444-4444-8444-444444444444';
const sqlFile = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const preparation = () => sqlFile('../../supabase/migrations/20260908120000_verified_payment_boundary.sql');
const notificationTrigger = () => sqlFile('../../supabase/migrations/20260224065624_add_refunded_status_to_alimtalk_trigger.sql');
const triggerDefinition = async (db) => (await db.query(`SELECT pg_get_functiondef(oid) definition,proacl::text acl,prosecdef
  FROM pg_proc WHERE oid='public.notify_reservation_event()'::regprocedure`)).rows[0];

// Local queue stub only: no pg_net extension, worker, HTTP request, or delivery is run.
// Its SECURITY INVOKER dependencies match the queue/sequence/helper access used by
// the public net.http_post(text,jsonb,jsonb,jsonb,integer) contract.
const queueStub = `
  CREATE SCHEMA net;
  CREATE TABLE net.http_request_queue(id bigserial PRIMARY KEY,method text,url text,headers jsonb,body bytea,timeout_milliseconds integer);
  CREATE FUNCTION net._urlencode_string(value varchar) RETURNS text LANGUAGE sql AS $$ SELECT value::text $$;
  CREATE FUNCTION net._encode_url_with_params_array(url text,params text[]) RETURNS text LANGUAGE sql
    AS $$ SELECT net._urlencode_string(url::varchar) $$;
  CREATE FUNCTION net.wake() RETURNS void LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$;
  CREATE FUNCTION net.http_post(url text,body jsonb DEFAULT '{}'::jsonb,params jsonb DEFAULT '{}'::jsonb,
    headers jsonb DEFAULT '{"Content-Type":"application/json"}'::jsonb,timeout_milliseconds integer DEFAULT 5000)
    RETURNS bigint LANGUAGE plpgsql AS $$ DECLARE request_id bigint; BEGIN
      INSERT INTO net.http_request_queue(method,url,headers,body,timeout_milliseconds)
        VALUES('POST',net._encode_url_with_params_array(url,'{}'::text[]),headers,convert_to(body::text,'UTF8'),timeout_milliseconds)
        RETURNING id INTO request_id;
      PERFORM net.wake();
      RETURN request_id;
    END $$;
  REVOKE ALL ON SCHEMA net FROM PUBLIC,anon,authenticated,service_role;
  REVOKE ALL ON ALL TABLES IN SCHEMA net FROM PUBLIC,anon,authenticated,service_role;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA net FROM PUBLIC,anon,authenticated,service_role;
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC,anon,authenticated,service_role;
`;

test('preparation supports the actual legacy invoker trigger with restricted pg_net ACLs', async () => {
  const db = new PGlite();
  try {
    await db.exec(await sqlFile('./fixture.sql'));
    await db.exec(queueStub);
    await db.exec(await notificationTrigger());
    const before = await triggerDefinition(db);
    assert.equal(before.prosecdef, false);
    await db.exec(await preparation());
    assert.deepEqual(await triggerDefinition(db), before, 'legacy trigger definition and ACL are preserved');
    const privileges = (await db.query(`SELECT
      has_schema_privilege('damda_payment_code','net','USAGE') schema_usage,
      has_function_privilege('damda_payment_code','net.http_post(text,jsonb,jsonb,jsonb,integer)','EXECUTE') post,
      has_column_privilege('damda_payment_code','net.http_request_queue','id','SELECT') returning_id,
      has_sequence_privilege('damda_payment_code','net.http_request_queue_id_seq','USAGE') sequence_usage,
      has_table_privilege('damda_payment_code','net.http_request_queue','UPDATE,DELETE') mutate_queue,
      has_column_privilege('damda_payment_code','net.http_request_queue','body','SELECT') read_other_requests,
      has_schema_privilege('authenticated','net','USAGE') customer_net_access`)).rows[0];
    assert.deepEqual(privileges, {
      schema_usage: true, post: true, returning_id: true, sequence_usage: true,
      mutate_queue: false, read_other_requests: false, customer_net_access: false,
    });
    await db.query('INSERT INTO public.daycares VALUES($1)', [owner]);
    await db.query('INSERT INTO public.business_owners VALUES($1)', [vendor]);
    await db.query('INSERT INTO public.products(id,business_id,business_owner_id) VALUES($1,$2,$2)', [product, vendor]);
    await db.query('INSERT INTO public.admins VALUES($1,true)', [admin]);
    const items = [{ productId: product, businessOwnerId: vendor, reservedDate: '2099-12-20', participants: 1, totalAmount: 1000, options: [] }];
    await db.query(`INSERT INTO public.payment_orders(order_id,daycare_id,items,reserver_info,payment_method,amount)
      VALUES('LEGACY-NOTIFY',$1,$2,'{}','card',1000)`, [owner, JSON.stringify(items)]);
    const evidence = {
      tid: 'legacy-notify-tid', orderId: 'LEGACY-NOTIFY', amount: 1000, balanceAmt: 1000, currency: 'KRW', status: 'paid',
      payMethod: 'card', environment: 'production', merchantKeyHash: 'a'.repeat(64), responseHash: 'b'.repeat(64), paidAt: '2026-09-08T10:00:00+09:00',
    };
    const finalize = () => db.query('SELECT public.finalize_verified_payment($1,$2,$3,$4,$5,$6) result',
      ['LEGACY-NOTIFY', 'legacy-notify-tid', owner, admin, 'admin', JSON.stringify(evidence)]);
    await db.exec('REVOKE USAGE ON SCHEMA net FROM damda_payment_code');
    await db.exec("SELECT set_config('request.jwt.claim.role','service_role',false); SET ROLE service_role");
    await assert.rejects(finalize(), /permission denied for schema net/);
    await db.exec('RESET ROLE');
    assert.equal((await db.query("SELECT count(*)::int count FROM public.payments WHERE pg_tid='legacy-notify-tid'")).rows[0].count, 0);
    await db.exec('GRANT USAGE ON SCHEMA net TO damda_payment_code; SET ROLE service_role');
    const result = (await finalize()).rows[0].result;
    assert.equal(result.reservationIds.length, 1);
    await db.exec('RESET ROLE');
    const queued = (await db.query("SELECT method,convert_from(body,'UTF8')::jsonb body FROM net.http_request_queue")).rows;
    assert.equal(queued.length, 1);
    assert.equal(queued[0].method, 'POST');
    assert.deepEqual(queued[0].body, { event: 'reservation_paid', reservation_id: result.reservationIds[0] });
    assert.deepEqual(await triggerDefinition(db), before);
  } finally {
    await db.close();
  }
});

test('missing pg_net aborts preparation when the installed legacy trigger requires it', async () => {
  const db = new PGlite();
  try {
    await db.exec(await sqlFile('./fixture.sql'));
    await db.exec(await notificationTrigger());
    const before = await triggerDefinition(db);
    await assert.rejects(db.exec(await preparation()), /legacy notification requires pg_net/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT to_regnamespace('payment_private') prepared")).rows[0].prepared, null);
    assert.deepEqual(await triggerDefinition(db), before);
  } finally {
    await db.close();
  }
});
