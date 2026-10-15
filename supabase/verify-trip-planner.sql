-- Read-only verification in the intended Supabase project's SQL editor.
SELECT table_name,column_name,data_type FROM information_schema.columns
WHERE table_schema='public' AND
 ((table_name='trips' AND column_name IN ('timezone','preparation','destination_latitude','destination_longitude','destination_source'))
 OR (table_name='trip_days' AND column_name='is_ideas')
 OR (table_name='itinerary_items' AND column_name IN ('location_name','time_label','booking_reference','end_time','end_day_offset'))
 OR (table_name='memories' AND column_name IN ('itinerary_item_id','journal_entry_id')))
ORDER BY table_name,column_name;
SELECT routine_name,security_type FROM information_schema.routines
WHERE routine_schema='public' AND routine_name IN
 ('ensure_trip_days','create_trip_draft','save_trip_activity','move_trip_activity','validate_planner_links','sync_trip_dates','validate_trip_plan','validate_activity_interval','name_trip_day');
SELECT tablename,policyname,cmd,roles,qual,with_check FROM pg_policies
WHERE schemaname='public' AND tablename IN ('trips','trip_days','itinerary_items','memories','journal_entries');
SELECT event_object_table,trigger_name,event_manipulation FROM information_schema.triggers
WHERE trigger_schema='public' AND trigger_name IN ('validate_planner_links','sync_trip_dates','validate_trip_plan','validate_activity_interval');
SELECT id,public FROM storage.buckets WHERE id IN ('cronevia-media','stickers-custom');
-- Both buckets must remain private. SQL-editor installs may not appear in the CLI migration ledger.
SELECT pg_get_functiondef('public.create_trip_draft(uuid,jsonb)'::regprocedure);
-- The INSERT above must include destination_latitude, destination_longitude and destination_source.
SELECT conname,pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='public.trips'::regclass AND conname='trips_destination_pin';
