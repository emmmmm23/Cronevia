-- Cronevia creative trackers: additive upgrade; review before running. Existing journal and trip data are retained.
BEGIN;
-- 20261028000001_creative_trackers.sql
-- Creative personal trackers. Uses existing Supabase Auth and private cronevia-media storage.

CREATE TABLE IF NOT EXISTS public.creative_trackers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL, kind text NOT NULL CHECK(kind IN ('habit','count','quantity','duration','steps','sleep','category','custom')),
 unit text NOT NULL DEFAULT '', config jsonb NOT NULL, design jsonb NOT NULL,
 archived boolean NOT NULL DEFAULT false, is_template boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tracker_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tracker_id uuid NOT NULL REFERENCES public.creative_trackers(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, log_date date NOT NULL,
 values jsonb NOT NULL, started_at timestamptz, ended_at timestamptz, timezone text NOT NULL,
 config_snapshot jsonb NOT NULL, unit_snapshot text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((started_at IS NULL AND ended_at IS NULL) OR (started_at IS NOT NULL AND ended_at>started_at))
);
-- Daily totals replace, session/custom multiple logs retain independent stable IDs.
CREATE UNIQUE INDEX IF NOT EXISTS tracker_single_day ON public.tracker_logs(tracker_id,log_date)
 WHERE (values->>'multiple') IS DISTINCT FROM 'true';
CREATE INDEX IF NOT EXISTS tracker_logs_owner_date ON public.tracker_logs(user_id,log_date);
CREATE TABLE IF NOT EXISTS public.tracker_boards (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, name text NOT NULL DEFAULT 'My little rhythms',
 tracker_ids uuid[] NOT NULL DEFAULT '{}', wide_ids uuid[] NOT NULL DEFAULT '{}', design jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.creative_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_boards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tracker_owner_read ON public.creative_trackers;
CREATE POLICY tracker_owner_read ON public.creative_trackers FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.is_account_active());
DROP POLICY IF EXISTS tracker_logs_owner_read ON public.tracker_logs;
CREATE POLICY tracker_logs_owner_read ON public.tracker_logs FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.is_account_active());
DROP POLICY IF EXISTS tracker_board_owner_read ON public.tracker_boards;
CREATE POLICY tracker_board_owner_read ON public.tracker_boards FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.is_account_active());
REVOKE ALL ON public.creative_trackers,public.tracker_logs,public.tracker_boards FROM anon,authenticated;
GRANT SELECT ON public.creative_trackers,public.tracker_logs,public.tracker_boards TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_tracker_design(design jsonb,owner_id uuid) RETURNS void
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE d jsonb; asset text;
BEGIN
 IF jsonb_typeof(design) IS DISTINCT FROM 'object' OR octet_length(design::text)>100000
 OR design->>'paper' NOT IN ('grid','dot','lined','blank') OR design->>'paper' IS NULL
 OR design->>'font' NOT IN ('hand','serif','sans') OR design->>'font' IS NULL
 OR coalesce(design->>'color','') !~ '^#[0-9a-fA-F]{6}$' OR coalesce(design->>'accent','') !~ '^#[0-9a-fA-F]{6}$'
 OR length(coalesce(design->>'heading',''))>150
 OR jsonb_typeof(design->'decorations') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Choose valid paper, colors, and decorations'; END IF;
 IF jsonb_array_length(design->'decorations')>50 THEN RAISE EXCEPTION 'Use up to 50 decorations per page'; END IF;
 asset:=design->>'background';
 IF asset IS NOT NULL AND asset NOT LIKE owner_id::text||'/trackers/%' THEN RAISE EXCEPTION 'Background must belong to you'; END IF;
 FOR d IN SELECT value FROM jsonb_array_elements(design->'decorations') LOOP
  IF jsonb_typeof(d) IS DISTINCT FROM 'object' OR jsonb_typeof(d->'x') IS DISTINCT FROM 'number'
  OR jsonb_typeof(d->'y') IS DISTINCT FROM 'number' OR jsonb_typeof(d->'width') IS DISTINCT FROM 'number'
  OR jsonb_typeof(d->'rotation') IS DISTINCT FROM 'number' OR jsonb_typeof(d->'z') IS DISTINCT FROM 'number'
  OR (d->>'x')::numeric NOT BETWEEN 0 AND 1 OR (d->>'y')::numeric NOT BETWEEN 0 AND 1
  OR (d->>'width')::numeric NOT BETWEEN .05 AND 1 OR abs((d->>'rotation')::numeric)>180
  OR (d->>'z')::numeric NOT BETWEEN 0 AND 1000 OR length(coalesce(d->>'text',''))>100
  THEN RAISE EXCEPTION 'Decoration placement is invalid'; END IF;
  asset:=coalesce(d->>'asset','');
  IF asset<>'' AND asset NOT LIKE owner_id::text||'/trackers/%'
    AND asset !~ '^/stickers-builtin/[a-z0-9-]+[.]svg$' THEN RAISE EXCEPTION 'Sticker must belong to you'; END IF;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.save_creative_tracker(target_id uuid,details jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old public.creative_trackers; saved public.creative_trackers; cfg jsonb; f jsonb; c jsonb; day jsonb; effective date;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Please sign in to an active account'; END IF;
 IF target_id IS NULL OR length(trim(coalesce(details->>'name',''))) NOT BETWEEN 1 AND 100
 OR coalesce(details->>'kind','') NOT IN ('habit','count','quantity','duration','steps','sleep','category','custom')
 OR length(coalesce(details->>'unit',''))>30 THEN RAISE EXCEPTION 'Provide a name, tracker type, and valid unit'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(target_id::text,0));
 SELECT * INTO old FROM public.creative_trackers WHERE id=target_id FOR UPDATE;
 IF old.id IS NOT NULL AND old.user_id<>auth.uid() THEN RAISE EXCEPTION 'Tracker unavailable'; END IF;
 cfg:=details->'config';
 IF jsonb_typeof(cfg) IS DISTINCT FROM 'object' OR jsonb_typeof(cfg->'schedule') IS DISTINCT FROM 'array'
 OR jsonb_typeof(cfg->'categories') IS DISTINCT FROM 'array' OR jsonb_typeof(cfg->'fields') IS DISTINCT FROM 'array'
 OR coalesce(cfg->>'aggregation','') NOT IN ('sum','latest','average','max')
 OR jsonb_typeof(cfg->'multiple') IS DISTINCT FROM 'boolean' OR octet_length(cfg::text)>50000
 THEN RAISE EXCEPTION 'Tracker settings are invalid'; END IF;
 IF jsonb_array_length(cfg->'schedule')>7 OR jsonb_array_length(cfg->'categories')>12 OR jsonb_array_length(cfg->'fields')>12 THEN RAISE EXCEPTION 'Use up to seven weekdays, twelve categories, and twelve fields'; END IF;
 FOR day IN SELECT value FROM jsonb_array_elements(cfg->'schedule') LOOP
  IF jsonb_typeof(day)<>'number' OR day::text !~ '^[0-6]$' THEN RAISE EXCEPTION 'Choose valid weekdays'; END IF;
 END LOOP;
 IF cfg->'goal'<>'null'::jsonb AND (coalesce(cfg->'goal'->>'direction','') NOT IN ('at_least','at_most')
 OR jsonb_typeof(cfg->'goal'->'target') IS DISTINCT FROM 'number' OR (cfg->'goal'->>'target')::numeric<0)
 THEN RAISE EXCEPTION 'Provide a nonnegative goal'; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(cfg->'categories') LOOP
  IF coalesce(c->>'id','') !~ '^[a-zA-Z0-9_-]{1,60}$' OR length(trim(coalesce(c->>'label',''))) NOT BETWEEN 1 AND 80
  OR coalesce(c->>'color','') !~ '^#[0-9a-fA-F]{6}$' THEN RAISE EXCEPTION 'Choose a label and color for every category'; END IF;
 END LOOP;
 IF details->>'kind'='category' AND jsonb_array_length(cfg->'categories')<1 THEN RAISE EXCEPTION 'Add a color category'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(cfg->'categories'))<>(SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(cfg->'categories')) THEN RAISE EXCEPTION 'Category IDs must be unique'; END IF;
 FOR f IN SELECT value FROM jsonb_array_elements(cfg->'fields') LOOP
  IF coalesce(f->>'id','') !~ '^[a-zA-Z0-9_-]{1,60}$' OR length(trim(coalesce(f->>'label',''))) NOT BETWEEN 1 AND 80
  OR coalesce(f->>'type','') NOT IN ('checkbox','number','duration','rating','choice','multi','text')
  OR length(coalesce(f->>'unit',''))>30 OR jsonb_typeof(f->'options') IS DISTINCT FROM 'array'
  OR jsonb_array_length(f->'options')>20 OR jsonb_typeof(f->'max') IS DISTINCT FROM 'number'
  OR (f->>'max')::numeric NOT BETWEEN 2 AND 10 THEN RAISE EXCEPTION 'Custom field settings are invalid'; END IF;
  IF f->>'type' IN ('choice','multi') AND jsonb_array_length(f->'options')<1 THEN RAISE EXCEPTION 'Add choices for your choice field'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(f->'options') o WHERE jsonb_typeof(o)<>'string' OR length(o#>>'{}') NOT BETWEEN 1 AND 100) THEN RAISE EXCEPTION 'Use short text labels for choices'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM jsonb_array_elements(cfg->'fields'))<>(SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(cfg->'fields')) THEN RAISE EXCEPTION 'Field IDs must be unique'; END IF;
 IF details->>'kind'='custom' AND jsonb_array_length(cfg->'fields')<1 THEN RAISE EXCEPTION 'Add a field to your custom tracker'; END IF;
 IF old.id IS NOT NULL AND EXISTS(SELECT 1 FROM public.tracker_logs WHERE tracker_id=target_id) AND
 (old.kind<>details->>'kind' OR old.unit<>coalesce(details->>'unit','') OR old.config->'fields'<>cfg->'fields'
 OR old.config->'multiple'<>cfg->'multiple' OR old.config->'aggregation'<>cfg->'aggregation') THEN
  RAISE EXCEPTION 'Duplicate this design to change the type, unit, fields, or aggregation after logging. Your earlier records will keep their meaning';
 END IF;
 effective:=coalesce((details->>'effective_date')::date,current_date);
 IF abs(effective-current_date)>1 THEN RAISE EXCEPTION 'Settings changes must start today'; END IF;
 cfg:=cfg-'history';
 IF old.id IS NOT NULL THEN
  cfg:=cfg||jsonb_build_object('history',coalesce(old.config->'history',jsonb_build_array(jsonb_build_object('from','0001-01-01','schedule',old.config->'schedule','goal',old.config->'goal'))));
  IF old.config->'schedule' IS DISTINCT FROM cfg->'schedule' OR old.config->'goal' IS DISTINCT FROM cfg->'goal' THEN
   cfg:=jsonb_set(cfg,'{history}',(cfg->'history')||jsonb_build_array(jsonb_build_object('from',effective,'schedule',cfg->'schedule','goal',cfg->'goal')));
  END IF;
 ELSE
  cfg:=cfg||jsonb_build_object('history',jsonb_build_array(jsonb_build_object('from','0001-01-01','schedule',cfg->'schedule','goal',cfg->'goal')));
 END IF;
 PERFORM public.validate_tracker_design(details->'design',auth.uid());
 INSERT INTO public.creative_trackers(id,user_id,name,kind,unit,config,design,archived,is_template)
 VALUES(target_id,auth.uid(),trim(details->>'name'),details->>'kind',coalesce(details->>'unit',''),cfg,details->'design',coalesce((details->>'archived')::boolean,false),coalesce((details->>'is_template')::boolean,false))
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,kind=excluded.kind,unit=excluded.unit,config=excluded.config,
 design=excluded.design,archived=excluded.archived,is_template=excluded.is_template,updated_at=now() RETURNING * INTO saved;
 RETURN to_jsonb(saved);
END $$;

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

CREATE OR REPLACE FUNCTION public.remove_tracker_log(target_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Please sign in'; END IF;
 DELETE FROM public.tracker_logs WHERE id=target_id AND user_id=auth.uid();
END $$;
CREATE OR REPLACE FUNCTION public.delete_creative_tracker(target_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Please sign in'; END IF;
 DELETE FROM public.creative_trackers WHERE id=target_id AND user_id=auth.uid();
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
REVOKE ALL ON FUNCTION public.validate_tracker_design(jsonb,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_creative_tracker(uuid,jsonb),public.save_tracker_log(uuid,uuid,date,jsonb,timestamptz,timestamptz,text),
 public.remove_tracker_log(uuid),public.delete_creative_tracker(uuid),public.save_tracker_board(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_creative_tracker(uuid,jsonb),public.save_tracker_log(uuid,uuid,date,jsonb,timestamptz,timestamptz,text),
 public.remove_tracker_log(uuid),public.delete_creative_tracker(uuid),public.save_tracker_board(jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';

-- 20261028000002_journal_tracker_links.sql
-- Live journal references share the tracker records; no tracker values are copied into journal content.

ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS tracker_links jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE OR REPLACE FUNCTION public.validate_journal_tracker_links() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE link jsonb;
BEGIN
 IF jsonb_typeof(NEW.tracker_links) IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.tracker_links)>5 THEN RAISE EXCEPTION 'Use up to five tracker links'; END IF;
 FOR link IN SELECT value FROM jsonb_array_elements(NEW.tracker_links) LOOP
  IF coalesce(link->>'month','') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Choose a valid month'; END IF;
  IF link->>'id' IS DISTINCT FROM 'board' AND NOT EXISTS(
   SELECT 1 FROM public.creative_trackers WHERE id::text=link->>'id' AND user_id=NEW.user_id AND NOT is_template)
  THEN RAISE EXCEPTION 'Link a tracker from your own notebook'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_journal_tracker_links ON public.journal_entries;
CREATE TRIGGER validate_journal_tracker_links BEFORE INSERT OR UPDATE OF tracker_links ON public.journal_entries
 FOR EACH ROW EXECUTE FUNCTION public.validate_journal_tracker_links();
REVOKE ALL ON FUNCTION public.validate_journal_tracker_links() FROM PUBLIC,anon,authenticated;

-- 20261028000003_tracker_validation.sql
-- Correct tracker custom-field validation aliases and board membership checks. Preserves all existing records.
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
