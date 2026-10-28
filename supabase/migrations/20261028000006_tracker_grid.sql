-- Replace a grid day's intervals atomically, reusing the existing log validation.
BEGIN;
CREATE OR REPLACE FUNCTION public.save_tracker_grid_day(target_tracker uuid,entry_date date,expected_rows jsonb,new_entries jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.creative_trackers; old_rows jsonb; entry jsonb; old_entry jsonb; saved jsonb; output jsonb:='[]'; expected record; row_count integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Please finish signing in.' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(target_tracker::text,0));
 SELECT * INTO t FROM public.creative_trackers WHERE id=target_tracker AND user_id=auth.uid() AND NOT archived AND NOT is_template;
 IF t.id IS NULL OR t.kind NOT IN ('count','quantity','duration','steps','sleep') THEN RAISE EXCEPTION 'Tracker unavailable.' USING ERRCODE='42501'; END IF;
 IF entry_date IS NULL OR jsonb_typeof(expected_rows) IS DISTINCT FROM 'array' OR jsonb_typeof(new_entries) IS DISTINCT FROM 'array'
 OR jsonb_array_length(new_entries)>128 OR octet_length(new_entries::text)>200000 THEN RAISE EXCEPTION 'Invalid grid selection.'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(l)),'[]'),count(*) INTO old_rows,row_count FROM public.tracker_logs l WHERE tracker_id=target_tracker AND log_date=entry_date;
 IF row_count<>jsonb_array_length(expected_rows) THEN RAISE EXCEPTION 'This day changed in another tab. Reload before editing.' USING ERRCODE='40001'; END IF;
 FOR expected IN SELECT * FROM jsonb_to_recordset(expected_rows) AS x(id uuid,updated_at timestamptz) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.tracker_logs l WHERE l.tracker_id=target_tracker AND l.log_date=entry_date AND l.id=expected.id AND l.updated_at=expected.updated_at) THEN
   RAISE EXCEPTION 'This day changed in another tab. Reload before editing.' USING ERRCODE='40001';
  END IF;
 END LOOP;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(expected_rows))<>row_count OR
 (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(new_entries))<>jsonb_array_length(new_entries) THEN RAISE EXCEPTION 'Invalid grid entries.'; END IF;
 IF t.kind<>'sleep' AND jsonb_array_length(new_entries)>1 THEN RAISE EXCEPTION 'Choose one daily total.'; END IF;
 FOR entry IN SELECT value FROM jsonb_array_elements(new_entries) LOOP
  IF entry->>'id' IS NULL OR EXISTS(SELECT 1 FROM public.tracker_logs l WHERE l.id=(entry->>'id')::uuid AND (l.tracker_id<>target_tracker OR l.user_id<>auth.uid() OR l.log_date<>entry_date)) THEN RAISE EXCEPTION 'Entry unavailable.' USING ERRCODE='42501'; END IF;
 END LOOP;
 -- Do not silently discard an attached memory when clearing its time blocks.
 FOR old_entry IN SELECT value FROM jsonb_array_elements(old_rows) LOOP
  IF (coalesce(old_entry->'values'->>'note','')<>'' OR coalesce(old_entry->'values'->>'photo','')<>'') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(new_entries) e WHERE e->>'id'=old_entry->>'id') THEN
   RAISE EXCEPTION 'This session has a note or photo. Remove those details before clearing its last box.';
  END IF;
 END LOOP;
 DELETE FROM public.tracker_logs WHERE tracker_id=target_tracker AND log_date=entry_date;
 FOR entry IN SELECT value FROM jsonb_array_elements(new_entries) LOOP
  saved:=public.save_tracker_log(target_tracker,(entry->>'id')::uuid,entry_date,entry->'values',(entry->>'started_at')::timestamptz,(entry->>'ended_at')::timestamptz,entry->>'timezone');
  IF (saved->>'log_date')::date<>entry_date THEN RAISE EXCEPTION 'Keep sleep on its wake-up date.'; END IF;
  SELECT value INTO old_entry FROM jsonb_array_elements(old_rows) WHERE value->>'id'=entry->>'id';
  IF old_entry IS NOT NULL THEN
   UPDATE public.tracker_logs SET config_snapshot=old_entry->'config_snapshot',unit_snapshot=old_entry->>'unit_snapshot',created_at=(old_entry->>'created_at')::timestamptz WHERE id=(saved->>'id')::uuid;
   SELECT to_jsonb(l) INTO saved FROM public.tracker_logs l WHERE id=(saved->>'id')::uuid;
  END IF;
  output:=output||jsonb_build_array(saved);
 END LOOP;
 RETURN output;
END $$;
REVOKE ALL ON FUNCTION public.save_tracker_grid_day(uuid,date,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_tracker_grid_day(uuid,date,jsonb,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.tracker_grid_schema_version() RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT '20261028.6' $$;
GRANT EXECUTE ON FUNCTION public.tracker_grid_schema_version() TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
