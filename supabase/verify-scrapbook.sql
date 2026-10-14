-- Read-only: execute in the SQL editor for lrgxrfyzakehsnifypmd.
SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets
WHERE id IN ('stickers-custom','cronevia-media');
SELECT schemaname,tablename,policyname,cmd,roles,qual,with_check FROM pg_policies
WHERE schemaname='storage' AND tablename='objects';
SELECT to_regclass('public.sticker_assets'),to_regclass('public.journal_sticker_placements');
SELECT table_name,column_name,data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('journal_entries','memories') AND column_name='scrapbook_layout';
-- SQL-editor installs may not be tracked in the CLI migration ledger.
-- If supabase_migrations.schema_migrations exists, inspect it for 20261012000001 and 20261014000001.

SELECT count(*) AS bundled_compatibility_assets FROM public.sticker_assets WHERE user_id IS NULL;
SELECT routine_name,security_type FROM information_schema.routines WHERE routine_schema='public' AND routine_name IN ('replace_journal_stickers','create_journal_draft','create_memory_draft','validate_scrapbook_layout');
-- Also inspect migration version 20261014000002 if using CLI-managed migrations.
