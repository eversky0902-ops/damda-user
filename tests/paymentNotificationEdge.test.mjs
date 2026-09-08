import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { timingSafeEqual } from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../supabase/functions/send-alimtalk/index.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

const reservationId = '11111111-2222-4333-8444-555555555555';
const reservation = {
  id: reservationId, reserved_date: '2026-09-09', reserved_time: '10:00', participant_count: 1,
  total_amount: 1000, reserver_phone: '010-1111-1111', reserver_name: 'fixture reserver',
  daycares: { id: 'daycare-fixture', name: 'fixture daycare', contact_name: 'fixture', contact_phone: '010-1111-1111' },
  products: { id: 'product-fixture', name: 'fixture product', address: 'fixture address' },
  business_owners: { id: 'owner-fixture', contact_name: 'fixture owner', contact_phone: '010-2222-2222' },
};

function harness({ lookup = { data: reservation, error: null }, claim, providerCode = 0,
  workerSecret = 'fixture-worker-secret', boundaryError = null } = {}) {
  const calls = [];
  const recipients = new Set();
  let handler;
  const client = {
    from(table) {
      calls.push(['from', table]);
      return {
        select() { return this; },
        eq() { return this; },
        async single() { return lookup; },
        async insert(value) { calls.push(['insert', table, value]); return { error: null }; },
      };
    },
    async rpc(name, parameters) {
      calls.push(['rpc', name]);
      if (name === 'assert_payment_boundary') return { data: null, error: boundaryError };
      if (name === 'claim_payment_notification') {
        if (claim) return claim;
        const key = `${parameters.p_reservation_id}:${parameters.p_recipient_type}`;
        const available = !recipients.has(key);
        recipients.add(key);
        return { data: available, error: null };
      }
      if (name === 'send_alimtalk_http') return { data: { body: { code: providerCode, message: 'fixture' } }, error: null };
      throw new Error(`Unexpected RPC: ${name}`);
    },
  };
  const context = vm.createContext({
    createClient: () => client,
    Deno: {
      env: { get: (name) => name === 'PAYMENT_WORKER_SECRET' ? workerSecret
        : name === 'SUPABASE_SERVICE_ROLE_KEY' ? 'edge-service-key-different-from-vercel' : 'fixture' },
      serve: (callback) => { handler = callback; },
    },
    console: { log() {}, error() {} },
    URLSearchParams, Response, Request,
  });
  vm.runInContext(compiled, context);
  return { calls, handler, sendAndLog: vm.runInContext('sendAndLog', context) };
}

function paidRequest(authorization = 'Bearer fixture-worker-secret', extra = {}) {
  return new Request('https://fixture.invalid/send-alimtalk', {
    method: 'POST',
    headers: authorization ? { authorization } : {},
    body: JSON.stringify({ event: 'reservation_paid', reservation_id: reservationId, ...extra }),
  });
}

const notification = {
  notificationType: 'reservation_completed', templateCode: 'fixture', recipientType: 'daycare',
  recipientId: 'recipient-fixture', phone: '010-0000-0000', message: 'fixture', variables: {},
  referenceType: 'reservation', referenceId: 'reservation-fixture',
};

test('paid notifications reject absent, user, Supabase service and wrong worker credentials before DB access', async () => {
  for (const [token, extra] of [[null, {}], ['Bearer fixture-user-key', {}], ['Bearer edge-service-key-different-from-vercel', {}],
    ['Bearer wrong-worker-secret', {}], ['fixture-worker-secret', {}], ['Bearer fixture-worker-secret', { test_phone: '01000000000' }]]) {
    const { handler, calls } = harness();
    assert.equal((await handler(paidRequest(token, extra))).status, 403);
    assert.deepEqual(calls, []);
  }
});

test('an absent worker secret fails closed even for the literal undefined credential', async () => {
  for (const secret of [undefined, '']) {
    const { handler, calls } = harness({ workerSecret: secret ?? null });
    assert.equal((await handler(paidRequest('Bearer undefined'))).status, 403);
    assert.deepEqual(calls, []);
  }
});

for (const [name, lookup, status, reason] of [
  ['database lookup fails', { data: null, error: { message: 'fixture private DB failure' } }, 503, 'reservation_lookup_failed'],
  ['reservation is missing', { data: null, error: null }, 404, 'reservation_not_found'],
  ['related owner is missing', { data: { ...reservation, business_owners: null }, error: null }, 422, 'reservation_relations_incomplete'],
  ['recipient contact is missing', { data: { ...reservation, business_owners: { id: 'owner' } }, error: null }, 422, 'reservation_contacts_incomplete'],
]) {
  test(`paid worker receives failure when ${name}`, async () => {
    const { handler, calls } = harness({ lookup });
    const response = await handler(paidRequest());
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { success: false, reason });
    assert.equal(calls.some(([kind]) => kind === 'rpc' || kind === 'insert'), false);
  });
}

test('failed recipient claim prevents a provider send', async () => {
  const { sendAndLog, calls } = harness({ claim: { data: null, error: { message: 'fixture claim failure' } } });
  await assert.rejects(sendAndLog(notification), /claim failed/);
  assert.deepEqual(calls, [['rpc', 'claim_payment_notification']]);
});

test('the worker credential sends each paid recipient once even when Supabase service keys differ', async () => {
  const { handler, calls } = harness();
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal((await handler(paidRequest())).status, 200);
  }
  assert.equal(calls.filter(([kind, name]) => kind === 'rpc' && name === 'send_alimtalk_http').length, 2);
  const logs = calls.filter(([kind]) => kind === 'insert');
  assert.equal(logs.length, 2);
  assert.deepEqual(logs.map(([, , row]) => row.recipient_type), ['daycare', 'business_owner']);
});

test('health without a reservation only reads the payment boundary', async () => {
  const { handler, calls } = harness();
  const response = await handler(paidRequest(undefined, { event: 'payment_notification_health', reservation_id: undefined }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, ready: true });
  assert.deepEqual(calls, [['rpc', 'assert_payment_boundary']]);
});

test('health with a real reservation uses the paid lookup without claims, writes or provider calls', async () => {
  const { handler, calls } = harness();
  const response = await handler(paidRequest(undefined, { event: 'payment_notification_health' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, ready: true });
  assert.deepEqual(calls, [['rpc', 'assert_payment_boundary'], ['from', 'reservations']]);
});

test('health reports missing reservations and failed boundaries without leaking DB details', async () => {
  for (const [options, reason, expectedCalls] of [
    [{ lookup: { data: null, error: null } }, 'reservation_not_found', [['rpc', 'assert_payment_boundary'], ['from', 'reservations']]],
    [{ boundaryError: { message: 'private fixture diagnostic' } }, 'payment_boundary_unavailable', [['rpc', 'assert_payment_boundary']]],
  ]) {
    const { handler, calls } = harness(options);
    const response = await handler(paidRequest(undefined, { event: 'payment_notification_health' }));
    assert.equal(response.ok, false);
    assert.deepEqual(await response.json(), { success: false, reason });
    assert.deepEqual(calls, expectedCalls);
  }
});

test('health requires the worker credential and validates the optional reservation before DB access', async () => {
  for (const [token, extra, status] of [
    ['Bearer edge-service-key-different-from-vercel', {}, 403], [null, {}, 403],
    ['Bearer fixture-worker-secret', { reservation_id: 'invalid' }, 400],
    ['Bearer fixture-worker-secret', { test_phone: '01000000000' }, 403],
  ]) {
    const { handler, calls } = harness();
    assert.equal((await handler(paidRequest(token, { event: 'payment_notification_health', ...extra }))).status, status);
    assert.deepEqual(calls, []);
  }
});

const routeSource = readFileSync(new URL('../src/app/api/payment/notifications/route.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '');
const routeCompiled = ts.transpileModule(routeSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function workerHarness({ edge = harness(), workerSecret = 'fixture-worker-secret', edgeResponse, fetchError } = {}) {
  const calls = [];
  const exports = {};
  const context = vm.createContext({
    exports, Buffer, Response, AbortSignal, timingSafeEqual,
    NextResponse: { json: (body, init) => Response.json(body, init) },
    process: { env: { PAYMENT_WORKER_SECRET: workerSecret, NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid',
      SUPABASE_SERVICE_ROLE_KEY: 'vercel-service-key-different-from-edge' } },
    createServiceClient: () => ({ rpc: async (name, parameters) => {
      calls.push(['rpc', name, parameters]);
      return { data: name === 'claim_payment_notification' ? { reservationId } : null, error: null };
    } }),
    fetch: async (url, init) => {
      calls.push(['fetch', init.headers.Authorization, JSON.parse(init.body)]);
      if (fetchError) throw fetchError;
      return edgeResponse ?? edge.handler(new Request(url, init));
    },
  });
  vm.runInContext(routeCompiled, context);
  return { ...exports, calls, edgeCalls: edge.calls };
}

function workerRequest(path = '', authorization = 'Bearer fixture-worker-secret') {
  const request = new Request(`https://fixture.invalid/api/payment/notifications${path}`, {
    headers: authorization ? { authorization } : {},
  });
  Object.defineProperty(request, 'nextUrl', { value: new URL(request.url) });
  return request;
}

test('Next worker forwards its dedicated secret to Edge instead of its Supabase service credential', async () => {
  const { POST, calls, edgeCalls } = workerHarness();
  const result = await (await POST(workerRequest())).json();
  assert.deepEqual(result, { processed: 1, reviewRequired: false, downstreamStatus: 200, reason: null });
  assert.equal(calls.find(([name]) => name === 'fetch')[1], 'Bearer fixture-worker-secret');
  assert.equal(calls.find(([, name]) => name === 'finish_payment_notification')[2].p_success, true);
  assert.equal(edgeCalls.filter(([kind, name]) => kind === 'rpc' && name === 'send_alimtalk_http').length, 2);
});

test('Next GET verifies the live Edge lookup using zero claims, writes and provider sends', async () => {
  const { GET, calls, edgeCalls } = workerHarness();
  const response = await GET(workerRequest(`?reservationId=${reservationId}`));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ready: true, downstreamStatus: 200, reason: null });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].event, 'payment_notification_health');
  assert.deepEqual(edgeCalls, [['rpc', 'assert_payment_boundary'], ['from', 'reservations']]);
});

test('Next GET rejects missing credentials and malformed reservation IDs before any external request', async () => {
  for (const [path, token, status] of [['', null, 401], ['', 'fixture-worker-secret', 401], ['?reservationId=invalid', undefined, 400]]) {
    const { GET, calls, edgeCalls } = workerHarness();
    assert.equal((await GET(workerRequest(path, token))).status, status);
    assert.deepEqual(calls, []);
    assert.deepEqual(edgeCalls, []);
  }
});

test('Next GET surfaces a missing reservation safely without invoking delivery', async () => {
  const { GET, calls, edgeCalls } = workerHarness({ edge: harness({ lookup: { data: null, error: null } }) });
  const response = await GET(workerRequest(`?reservationId=${reservationId}`));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ready: false, downstreamStatus: 404, reason: 'reservation_not_found' });
  assert.equal(calls.length, 1);
  assert.deepEqual(edgeCalls, [['rpc', 'assert_payment_boundary'], ['from', 'reservations']]);
});

test('Next worker records safe downstream diagnostics and preserves review for rejected or uncertain delivery', async () => {
  for (const [options, downstreamStatus, reason] of [
    [{ edgeResponse: new Response('Forbidden with private fixture', { status: 403 }) }, 403, 'notification_unauthorized'],
    [{ edgeResponse: Response.json({ reason: 'private fixture error' }, { status: 500 }) }, 500, 'notification_edge_failure'],
    [{ fetchError: new Error('private fixture timeout') }, null, 'notification_edge_unavailable'],
  ]) {
    const { POST, calls } = workerHarness(options);
    assert.deepEqual(await (await POST(workerRequest())).json(), { processed: 1, reviewRequired: true, downstreamStatus, reason });
    const rpcCalls = calls.filter(([kind]) => kind === 'rpc');
    assert.deepEqual(rpcCalls.map(([, name]) => name), ['claim_payment_notification', 'finish_payment_notification']);
    assert.equal(rpcCalls[1][2].p_success, false);
  }
});

test('already claimed recipient is not sent or logged a second time', async () => {
  const { sendAndLog, calls } = harness({ claim: { data: false, error: null } });
  assert.equal((await sendAndLog(notification)).success, true);
  assert.deepEqual(calls, [['rpc', 'claim_payment_notification']]);
});

test('paid provider failure is logged and propagated for worker review', async () => {
  const { sendAndLog, calls } = harness({ providerCode: -1 });
  await assert.rejects(sendAndLog(notification), /delivery review/);
  assert.equal(calls.filter(([kind, name]) => kind === 'rpc' && name === 'send_alimtalk_http').length, 1);
  assert.equal(calls.find(([kind]) => kind === 'insert')[2].status, 'failed');
});

test('non-payment notifications retain their existing path without a payment claim', async () => {
  const { sendAndLog, calls } = harness();
  assert.equal((await sendAndLog({ ...notification, notificationType: 'reservation_cancelled' })).success, true);
  assert.equal(calls.some(([kind, name]) => kind === 'rpc' && name === 'claim_payment_notification'), false);
  assert.equal(calls.filter(([kind, name]) => kind === 'rpc' && name === 'send_alimtalk_http').length, 1);
});
