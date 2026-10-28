-- Read-only: run after apply-creative-trackers.sql in the intended Supabase project.
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public' AND tablename IN ('creative_trackers','tracker_logs','tracker_boards');
SELECT policyname,tablename,cmd,roles,qual FROM pg_policies
WHERE schemaname='public' AND tablename IN ('creative_trackers','tracker_logs','tracker_boards');
SELECT p.proname,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS signed_in_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('save_creative_tracker','save_tracker_log','remove_tracker_log','delete_creative_tracker','save_tracker_board');
SELECT column_name,data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='journal_entries' AND column_name='tracker_links';
-- Expected: RLS true on all three tables; owner-only SELECT policies; anonymous EXECUTE false;
-- signed-in EXECUTE true for the five write RPCs. No direct INSERT/UPDATE/DELETE grants.
SELECT grantee,table_name,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('creative_trackers','tracker_logs','tracker_boards')
AND grantee IN ('anon','authenticated');
