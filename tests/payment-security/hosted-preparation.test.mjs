import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const sqlFile = path => readFile(new URL(path,import.meta.url),'utf8');

test('PostgreSQL non-superuser CREATEROLE can prepare and transfer payment function ownership',async()=>{
  const db=new PGlite();
  try {
    const database=(await db.query('SELECT current_database() name')).rows[0].name.replaceAll('"','""');
    await db.exec(`CREATE ROLE payment_migrator NOSUPERUSER CREATEROLE;
      GRANT CREATE ON DATABASE "${database}" TO payment_migrator;
      ALTER SCHEMA public OWNER TO payment_migrator;
      SET ROLE payment_migrator; SET createrole_self_grant='';`);
    await db.exec(await sqlFile('./fixture.sql'));
    const preparation=await sqlFile('../../supabase/migrations/20260908120000_verified_payment_boundary.sql');
    await db.exec(preparation);
    const access=(await db.query(`SELECT
      (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) superuser,
      pg_has_role(current_user,'damda_payment_code','SET') can_set,
      pg_has_role(current_user,'damda_payment_code','USAGE') inherits,
      pg_has_role('authenticated','damda_payment_code','MEMBER') browser_member,
      (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='public.finalize_verified_payment(text,text,uuid,uuid,text,jsonb)'::regprocedure) function_owner`)).rows[0];
    assert.deepEqual(access,{superuser:false,can_set:true,inherits:true,browser_member:false,function_owner:'damda_payment_code'});
  } finally { await db.close(); }
});
