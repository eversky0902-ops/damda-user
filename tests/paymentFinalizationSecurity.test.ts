import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../src/app/api/payment/approve/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260906001000_lock_down_payment_finalizer.sql", import.meta.url), "utf8");

test("payment completion uses the service client after server-side NICEPAY approval", () => {
  assert.match(route, /createServiceClient/);
  assert.match(route, /method: "POST"/);
  assert.match(route, /body: JSON\.stringify\(\{ amount: order\.amount \}\)/);
  assert.match(route, /result\.tid === tid/);
  assert.match(route, /result\.orderId === order\.order_id/);
  assert.match(route, /Number\(result\.amount\) === order\.amount/);
  assert.match(route, /serviceSupabase\.rpc\("finalize_secure_payment_order"/);
});

test("payment finalizer is unavailable to browser roles and guards duplicate TIDs", () => {
  assert.match(migration, /REVOKE EXECUTE[\s\S]*FROM PUBLIC/);
  assert.match(migration, /FROM anon/);
  assert.match(migration, /FROM authenticated/);
  assert.match(migration, /GRANT EXECUTE[\s\S]*TO service_role/);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /payments_pg_tid_unique/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /pg_advisory_xact_lock/);
});
