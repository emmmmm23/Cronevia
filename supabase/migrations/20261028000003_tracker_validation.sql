-- Correct tracker custom-field validation aliases and board membership checks. Preserves all existing records.
BEGIN;
CREATE OR REPLACE FUNCTION public.save_tracker_log(target_tracker uuid,entry_id uuid,entry_date date,entry_values jsonb,
 session_start timestamptz DEFAULT NULL,session_end timestamptz DEFAULT NULL,entry_timezone text DEFAULT 'UTC') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.creative_trackers; old public.tracker_logs; saved public.tracker_logs; v jsonb; cfg jsonb; f jsonb; field_value jsonb; part jsonb; is_multiple boolean; day date;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Please sign in to an active account'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(target_tracker::text,0));
 SELECT * INTO t FROM public.creative_trackers WHERE id=target_tracker AND user_id=auth.uid() AND NOT archived AND NOT is_template;
 IF t.id IS NULL THEN RAISE EXCEPTION 'Tracker unavailable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=entry_timezone) THEN RAISE EXCEPTION 'Choose a valid time zone'; END IF;
 IF entry_id IS NULL OR jsonb_typeof(entry_values) IS DISTINCT FROM 'object' OR octet_length(entry_values::text)>30000 THEN RAISE EXCEPTION 'Log is invalid'; END IF;
 day:=entry_date;
 is_multiple:=t.kind='sleep' OR (t.kind='custom' AND (t.config->>'multiple')::boolean);
 SELECT * INTO old FROM public.tracker_logs WHERE id=entry_id;
 IF old.id IS NOT NULL AND (old.user_id<>auth.uid() OR old.tracker_id<>target_tracker) THEN RAISE EXCEPTION 'Log unavailable'; END IF;
 IF NOT is_multiple THEN
  SELECT * INTO old FROM public.tracker_logs WHERE tracker_id=target_tracker AND log_date=day;
 END IF;
 cfg:=coalesce(old.config_snapshot,t.config);
 v:=entry_values-'multiple';
 IF v->'note' IS NOT NULL AND jsonb_typeof(v->'note')<>'string' THEN RAISE EXCEPTION 'Notes must be text'; END IF;
 IF length(coalesce(v->>'note',''))>5000 THEN RAISE EXCEPTION 'Use up to 5000 characters in a note'; END IF;
 IF v->>'photo' IS NOT NULL AND v->>'photo' NOT LIKE auth.uid()::text||'/trackers/%' THEN RAISE EXCEPTION 'Photo must belong to you'; END IF;
 IF t.kind='sleep' THEN
  IF session_start IS NULL OR session_end IS NULL OR session_end<=session_start OR session_end-session_start>interval '24 hours'
  OR session_end>now()+interval '5 minutes' THEN RAISE EXCEPTION 'Choose an actual sleep session between zero and 24 hours'; END IF;
  IF jsonb_typeof(v->'awakeMinutes') IS DISTINCT FROM 'number' OR (v->>'awakeMinutes')::numeric<0
  OR (v->>'awakeMinutes')::numeric>=extract(epoch FROM (session_end-session_start))/60 THEN RAISE EXCEPTION 'Awake time must be shorter than the session'; END IF;
  IF coalesce(v->>'sleepType','') NOT IN ('night','nap') THEN RAISE EXCEPTION 'Choose night sleep or nap'; END IF;
  IF v->'quality' IS NOT NULL AND (jsonb_typeof(v->'quality')<>'number' OR (v->>'quality')::numeric NOT BETWEEN 1 AND 5) THEN RAISE EXCEPTION 'Quality must be from one to five'; END IF;
  IF EXISTS(SELECT 1 FROM public.tracker_logs WHERE tracker_id=target_tracker AND id<>entry_id AND started_at<session_end AND ended_at>session_start)
   THEN RAISE EXCEPTION 'This overlaps another sleep session. Review and correct the times'; END IF;
  day:=(session_end AT TIME ZONE entry_timezone)::date;
 ELSIF session_start IS NOT NULL OR session_end IS NOT NULL THEN RAISE EXCEPTION 'Only sleep logs accept session times';
 ELSIF t.kind='habit' THEN
  IF jsonb_typeof(v->'value') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Choose Yes or No'; END IF;
 ELSIF t.kind IN ('count','quantity','duration','steps') THEN
  IF jsonb_typeof(v->'value') IS DISTINCT FROM 'number' OR (v->>'value')::numeric NOT BETWEEN 0 AND 100000000
   THEN RAISE EXCEPTION 'Enter a nonnegative number'; END IF;
  IF t.kind IN ('count','steps') AND (v->>'value')::numeric<>trunc((v->>'value')::numeric) THEN RAISE EXCEPTION 'Enter a whole number'; END IF;
 ELSIF t.kind='category' THEN
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(cfg->'categories') c WHERE c->>'id'=v->>'category') THEN RAISE EXCEPTION 'Choose a category from this tracker'; END IF;
 ELSIF t.kind='custom' THEN
  IF jsonb_typeof(v->'fields') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Complete your custom fields'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(v->'fields') k WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(cfg->'fields') field_def WHERE field_def->>'id'=k)) THEN RAISE EXCEPTION 'Only configured custom fields can be logged'; END IF;
  FOR f IN SELECT value FROM jsonb_array_elements(cfg->'fields') LOOP
   field_value:=v->'fields'->(f->>'id');
   IF field_value IS NULL OR field_value='null'::jsonb THEN CONTINUE; END IF;
   IF f->>'type'='checkbox' AND jsonb_typeof(field_value)<>'boolean' THEN RAISE EXCEPTION 'Checkbox values must be Yes or No'; END IF;
   IF f->>'type' IN ('number','duration','rating') THEN
    IF jsonb_typeof(field_value)<>'number' OR field_value::text::numeric<0 OR field_value::text::numeric>100000000 THEN RAISE EXCEPTION 'Enter a valid nonnegative number'; END IF;
    IF f->>'type'='rating' AND field_value::text::numeric NOT BETWEEN 1 AND (f->>'max')::numeric THEN RAISE EXCEPTION 'Rating is outside the scale'; END IF;
   END IF;
   IF f->>'type'='text' AND (jsonb_typeof(field_value)<>'string' OR length(field_value#>>'{}')>2000) THEN RAISE EXCEPTION 'Use text up to 2000 characters'; END IF;
   IF f->>'type'='choice' AND NOT(f->'options' @> jsonb_build_array(field_value)) THEN RAISE EXCEPTION 'Choose a valid option'; END IF;
   IF f->>'type'='multi' THEN
    IF jsonb_typeof(field_value)<>'array' THEN RAISE EXCEPTION 'Choose valid options'; END IF;
    FOR part IN SELECT value FROM jsonb_array_elements(field_value) LOOP
     IF NOT(f->'options' @> jsonb_build_array(part)) THEN RAISE EXCEPTION 'Choose valid options'; END IF;
    END LOOP;
   END IF;
  END LOOP;
 END IF;
 IF day IS NULL OR day>(now() AT TIME ZONE entry_timezone)::date THEN RAISE EXCEPTION 'Choose today or a past date'; END IF;
 v:=v||jsonb_build_object('multiple',is_multiple);
 INSERT INTO public.tracker_logs(id,tracker_id,user_id,log_date,values,started_at,ended_at,timezone,config_snapshot,unit_snapshot)
 VALUES(coalesce(old.id,entry_id),target_tracker,auth.uid(),day,v,session_start,session_end,entry_timezone,cfg,t.unit)
 ON CONFLICT(id) DO UPDATE SET log_date=excluded.log_date,values=excluded.values,started_at=excluded.started_at,
 ended_at=excluded.ended_at,timezone=excluded.timezone,updated_at=now() RETURNING * INTO saved;
 RETURN to_jsonb(saved);
END $$;

CREATE OR REPLACE FUNCTION public.save_tracker_board(details jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ids uuid[]; widths uuid[]; saved public.tracker_boards;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Please sign in'; END IF;
 IF length(trim(coalesce(details->>'name',''))) NOT BETWEEN 1 AND 100 OR jsonb_typeof(details->'tracker_ids') IS DISTINCT FROM 'array'
 OR jsonb_typeof(details->'wide_ids') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Board settings are invalid'; END IF;
 SELECT coalesce(array_agg(value::uuid),'{}') INTO ids FROM jsonb_array_elements_text(details->'tracker_ids');
 SELECT coalesce(array_agg(value::uuid),'{}') INTO widths FROM jsonb_array_elements_text(details->'wide_ids');
 IF cardinality(ids)>50 OR EXISTS(SELECT 1 FROM unnest(ids) AS chosen(tracker_id) WHERE NOT EXISTS(SELECT 1 FROM public.creative_trackers t WHERE t.id=chosen.tracker_id AND t.user_id=auth.uid() AND NOT t.is_template))
 OR cardinality(ids)<>(SELECT count(DISTINCT id) FROM unnest(ids) id) OR NOT(widths<@ids) THEN RAISE EXCEPTION 'Choose your own trackers for this board'; END IF;
 PERFORM public.validate_tracker_design(details->'design',auth.uid());
 INSERT INTO public.tracker_boards(user_id,name,tracker_ids,wide_ids,design)
 VALUES(auth.uid(),trim(details->>'name'),ids,widths,details->'design')
 ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,tracker_ids=excluded.tracker_ids,wide_ids=excluded.wide_ids,design=excluded.design,updated_at=now()
 RETURNING * INTO saved;
 RETURN to_jsonb(saved);
END $$;
CREATE OR REPLACE FUNCTION public.tracker_schema_version() RETURNS text
LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT '20261028.3'::text $$;
REVOKE ALL ON FUNCTION public.tracker_schema_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tracker_schema_version() TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
