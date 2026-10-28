-- Read-only checks. No account secrets or content are selected.
SELECT public.security_schema_version();
SELECT schemaname,tablename,policyname,permissive,cmd FROM pg_policies
 WHERE policyname='account_mfa_required' ORDER BY schemaname,tablename;
SELECT p.proname,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('is_mfa_satisfied','is_account_active','is_super_admin','consume_place_request');
SELECT has_function_privilege('anon','public.consume_place_request()','EXECUTE') AS anonymous_quota_access_should_be_false;
