-- Run on the explicitly identified target DB with a read-only administrative connection.
-- No finalizer calls, fake payments, approvals, notifications, or recovered-record writes.
BEGIN TRANSACTION READ ONLY;
SELECT current_database(), current_user, version();
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) arguments,
  pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig,p.proacl,
  has_function_privilege('anon',p.oid,'EXECUTE') anon_effective,
  has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_effective,
  has_function_privilege('service_role',p.oid,'EXECUTE') server_effective,
  md5(p.prosrc) definition_hash,
  p.prosrc ~* '(finalize_.*payment|insert\s+into\s+(public\.)?(payments|reservations)|update\s+(public\.)?(payments|payment_orders|reservations))' potential_writer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.prokind='f' AND n.nspname NOT IN ('pg_catalog','information_schema') AND
 (p.proname ~* '(payment|reservation|settlement|recover|alimtalk)' OR
  p.prosrc ~* '(finalize_.*payment|insert\s+into\s+(public\.)?(payments|reservations)|update\s+(public\.)?(payments|payment_orders|reservations))')
ORDER BY n.nspname,p.proname,arguments;
SELECT member_role.rolname member,parent_role.rolname granted_role,m.admin_option
FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member
JOIN pg_roles parent_role ON parent_role.oid=m.roleid;
SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl,
  r.role,has_table_privilege(r.role,c.oid,'INSERT') can_insert,
  has_table_privilege(r.role,c.oid,'UPDATE') can_update,
  has_any_column_privilege(r.role,c.oid,'INSERT,UPDATE') any_column_write
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
CROSS JOIN (VALUES('anon'),('authenticated'),('service_role')) r(role)
WHERE n.nspname='public' AND c.relname IN ('payment_orders','payments','reservations','reservation_options','settlements');
SELECT * FROM pg_policies WHERE schemaname='public' AND tablename IN ('payment_orders','payments','reservations','reservation_options','settlements');
SELECT defaclrole::regrole,defaclnamespace::regnamespace,defaclobjtype,defaclacl FROM pg_default_acl;
SELECT event_object_table,trigger_name,action_timing,event_manipulation,action_statement FROM information_schema.triggers
WHERE event_object_schema='public' AND event_object_table IN ('payment_orders','payments','reservations','settlements');
-- Function bodies may contain embedded credentials in historical deployments.
-- Review definitions only in a restricted console; do not print raw bodies to shared logs.
COMMIT;
