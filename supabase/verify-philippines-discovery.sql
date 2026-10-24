-- Read-only, run after 20261019000001_philippines_discovery.sql.
SELECT column_name,data_type,is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='itinerary_items' AND column_name IN ('place_provider','provider_place_id');
SELECT p.proname,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.oid='public.save_discovered_trip_place(uuid,uuid,date,jsonb)'::regprocedure;
SELECT conname,pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='public.itinerary_items'::regclass AND conname='itinerary_provider_pair';
SELECT trigger_name,event_manipulation FROM information_schema.triggers
WHERE event_object_schema='public' AND trigger_name='clear_changed_place_provider';
