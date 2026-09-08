import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../supabase/functions/send-alimtalk/index.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

function harness({ lookup = { data: null, error: null }, claim = { data: true, error: null }, providerCode = 0 } = {}) {
  const calls = [];
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
    async rpc(name) {
      calls.push(['rpc', name]);
      if (name === 'claim_payment_notification') return claim;
      if (name === 'send_alimtalk_http') return { data: { body: { code: providerCode, message: 'fixture' } }, error: null };
      throw new Error(`Unexpected RPC: ${name}`);
    },
  };
  const context = vm.createContext({
    createClient: () => client,
    Deno: {
      env: { get: (name) => name === 'SUPABASE_SERVICE_ROLE_KEY' ? 'fixture-service-key' : 'fixture' },
      serve: (callback) => { handler = callback; },
    },
    console: { log() {}, error() {} },
    URLSearchParams, Response, Request,
  });
  vm.runInContext(compiled, context);
  return { calls, handler, sendAndLog: vm.runInContext('sendAndLog', context) };
}

function paidRequest(authorization = 'Bearer fixture-service-key', extra = {}) {
  return new Request('https://fixture.invalid/send-alimtalk', {
    method: 'POST',
    headers: authorization ? { authorization } : {},
    body: JSON.stringify({ event: 'reservation_paid', reservation_id: 'reservation-fixture', ...extra }),
  });
}

const notification = {
  notificationType: 'reservation_completed', templateCode: 'fixture', recipientType: 'daycare',
  recipientId: 'recipient-fixture', phone: '010-0000-0000', message: 'fixture', variables: {},
  referenceType: 'reservation', referenceId: 'reservation-fixture',
};

test('paid notifications reject absent or non-service credentials and recipient overrides before DB access', async () => {
  for (const [token, extra] of [[null, {}], ['Bearer fixture-user-key', {}], ['Bearer fixture-service-key', { test_phone: '01000000000' }]]) {
    const { handler, calls } = harness();
    assert.equal((await handler(paidRequest(token, extra))).status, 403);
    assert.deepEqual(calls, []);
  }
});

for (const [name, lookup] of [
  ['database lookup fails', { data: null, error: { message: 'fixture DB failure' } }],
  ['reservation is missing', { data: null, error: null }],
]) {
  test(`paid worker receives failure when ${name}`, async () => {
    const { handler, calls } = harness({ lookup });
    const response = await handler(paidRequest());
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /reservation lookup failed/);
    assert.equal(calls.some(([kind]) => kind === 'rpc' || kind === 'insert'), false);
  });
}

test('failed recipient claim prevents a provider send', async () => {
  const { sendAndLog, calls } = harness({ claim: { data: null, error: { message: 'fixture claim failure' } } });
  await assert.rejects(sendAndLog(notification), /claim failed/);
  assert.deepEqual(calls, [['rpc', 'claim_payment_notification']]);
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
