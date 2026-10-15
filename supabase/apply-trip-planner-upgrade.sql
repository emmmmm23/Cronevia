-- Idempotent planner upgrade for the October 14 Cronevia schema.
-- Review TRIPS_MEMORIES_REDESIGN.md before applying to the hosted project.
BEGIN;
-- Additive planner upgrade. Existing days, activities, media and budgets are retained.
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS preparation jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.trip_days ADD COLUMN IF NOT EXISTS is_ideas boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS one_ideas_list_per_trip ON public.trip_days(trip_id) WHERE is_ideas;
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS location_name text;
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS time_label text;
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS booking_reference text;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS itinerary_item_id uuid REFERENCES public.itinerary_items(id) ON DELETE SET NULL;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.validate_trip_plan() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE item jsonb; ids text[] := '{}';
BEGIN
 IF NEW.end_date IS NOT NULL AND (NEW.start_date IS NULL OR NEW.end_date<NEW.start_date) THEN RAISE EXCEPTION 'Choose an end date on or after the start date'; END IF;
 IF NEW.end_date-NEW.start_date>365 THEN RAISE EXCEPTION 'Plan up to 366 days in one trip'; END IF;
 IF NEW.timezone IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=NEW.timezone) THEN RAISE EXCEPTION 'Choose a valid IANA timezone'; END IF;
 IF jsonb_typeof(NEW.preparation) IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.preparation)>200 THEN RAISE EXCEPTION 'Invalid preparation checklist'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.preparation) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR coalesce(length(item->>'id'),0) NOT BETWEEN 1 AND 100 OR (item->>'id')=ANY(ids) OR coalesce(length(trim(item->>'title')),0) NOT BETWEEN 1 AND 300 OR jsonb_typeof(item->'done') IS DISTINCT FROM 'boolean' OR coalesce(item->>'category','') NOT IN ('packing','reservations','documents','reminders') THEN RAISE EXCEPTION 'Invalid preparation item'; END IF;
  ids:=array_append(ids,item->>'id');
 END LOOP;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_trip_plan ON public.trips;
CREATE TRIGGER validate_trip_plan BEFORE INSERT OR UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.validate_trip_plan();

CREATE OR REPLACE FUNCTION public.ensure_trip_days(target_trip_id uuid) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE t public.trips; n integer; i integer;
BEGIN
 SELECT * INTO t FROM public.trips WHERE id=target_trip_id AND user_id=auth.uid() AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trip unavailable'; END IF;
 n:=greatest(1,coalesce(t.end_date-t.start_date+1,1));
 IF n>366 THEN RAISE EXCEPTION 'Plan up to 366 days in one trip'; END IF;
 FOR i IN 1..n LOOP
  INSERT INTO public.trip_days(trip_id,day_number,date,title) VALUES(t.id,i,t.start_date+i-1,'Day '||i) ON CONFLICT(trip_id,day_number) DO NOTHING;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM public.trip_days WHERE trip_id=t.id AND is_ideas) THEN
  INSERT INTO public.trip_days(trip_id,day_number,title,is_ideas) SELECT t.id,least(0,coalesce(min(day_number),1)-1),'Ideas',true FROM public.trip_days WHERE trip_id=t.id;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.sync_trip_dates() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.start_date IS NOT DISTINCT FROM OLD.start_date AND NEW.end_date IS NOT DISTINCT FROM OLD.end_date THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  UPDATE public.trip_days SET date=NEW.start_date+day_number-1 WHERE trip_id=NEW.id AND NOT is_ideas;
 END IF;
 PERFORM public.ensure_trip_days(NEW.id);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_trip_dates ON public.trips;
CREATE TRIGGER sync_trip_dates AFTER UPDATE OF start_date,end_date ON public.trips FOR EACH ROW EXECUTE FUNCTION public.sync_trip_dates();

CREATE OR REPLACE FUNCTION public.create_trip_draft(draft_id uuid,details jsonb) RETURNS public.trips LANGUAGE plpgsql SET search_path=public AS $$
DECLARE result public.trips;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Sign in to create a trip'; END IF;
 IF coalesce(length(trim(details->>'title')),0) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'A trip name is required'; END IF;
 INSERT INTO public.trips(id,user_id,title,slug,destination,description,start_date,end_date,timezone)
 VALUES(draft_id,auth.uid(),trim(details->>'title'),'trip-'||draft_id,nullif(details->>'destination',''),nullif(details->>'description',''),nullif(details->>'start_date','')::date,nullif(details->>'end_date','')::date,nullif(details->>'timezone','')) ON CONFLICT(id) DO NOTHING;
 SELECT * INTO result FROM public.trips WHERE id=draft_id AND user_id=auth.uid() AND deleted_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trip unavailable'; END IF;
 PERFORM public.ensure_trip_days(result.id);
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.save_trip_activity(target_trip_id uuid,target_day_id uuid,activity_id uuid,details jsonb) RETURNS public.itinerary_items LANGUAGE plpgsql SET search_path=public AS $$
DECLARE result public.itinerary_items; prior public.itinerary_items;
BEGIN
 PERFORM 1 FROM public.trips WHERE id=target_trip_id AND user_id=auth.uid() AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.trip_days WHERE id=target_day_id AND trip_id=target_trip_id) THEN RAISE EXCEPTION 'Trip day unavailable'; END IF;
 IF coalesce(length(trim(details->>'title')),0) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'An activity title is required'; END IF;
 IF nullif(details->>'duration_minutes','')::integer IS NOT NULL AND (details->>'duration_minutes')::integer NOT BETWEEN 1 AND 1440 THEN RAISE EXCEPTION 'Duration must be between 1 and 1440 minutes'; END IF;
 SELECT * INTO prior FROM public.itinerary_items WHERE id=activity_id;
 IF FOUND AND NOT EXISTS(SELECT 1 FROM public.trip_days WHERE id=prior.trip_day_id AND trip_id=target_trip_id) THEN RAISE EXCEPTION 'Activity unavailable'; END IF;
 INSERT INTO public.itinerary_items(id,trip_day_id,title,description,start_time,duration_minutes,location_name,time_label,booking_reference,status,sort_order)
 VALUES(activity_id,target_day_id,trim(details->>'title'),nullif(details->>'description',''),nullif(details->>'scheduled_time','')::time,nullif(details->>'duration_minutes','')::integer,nullif(details->>'location_name',''),nullif(details->>'time_label',''),nullif(details->>'booking_reference',''),coalesce(details->>'status','planned'),coalesce((SELECT max(sort_order)+1 FROM public.itinerary_items WHERE trip_day_id=target_day_id),0))
 ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,start_time=excluded.start_time,duration_minutes=excluded.duration_minutes,location_name=excluded.location_name,time_label=excluded.time_label,booking_reference=excluded.booking_reference,status=excluded.status
 WHERE public.itinerary_items.trip_day_id=target_day_id RETURNING * INTO result;
 IF result.id IS NULL THEN RAISE EXCEPTION 'Use Move to day to move this activity'; END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.move_trip_activity(activity_id uuid,target_day_id uuid) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE source_trip uuid; target_trip uuid;
BEGIN
 SELECT d.trip_id INTO source_trip FROM public.itinerary_items i JOIN public.trip_days d ON d.id=i.trip_day_id WHERE i.id=activity_id;
 SELECT trip_id INTO target_trip FROM public.trip_days WHERE id=target_day_id;
 IF source_trip IS NULL OR target_trip IS DISTINCT FROM source_trip THEN RAISE EXCEPTION 'Move within this trip only'; END IF;
 PERFORM 1 FROM public.trips WHERE id=source_trip AND user_id=auth.uid() AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trip unavailable'; END IF;
 UPDATE public.itinerary_items SET trip_day_id=target_day_id,sort_order=coalesce((SELECT max(sort_order)+1 FROM public.itinerary_items WHERE trip_day_id=target_day_id),0) WHERE id=activity_id;
 UPDATE public.journal_entries SET trip_day_id=target_day_id WHERE itinerary_item_id=activity_id;
END $$;

CREATE OR REPLACE FUNCTION public.validate_planner_links() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE t uuid; d uuid;
BEGIN
 IF NEW.itinerary_item_id IS NOT NULL THEN
  SELECT days.trip_id,days.id INTO t,d FROM public.itinerary_items i JOIN public.trip_days days ON days.id=i.trip_day_id WHERE i.id=NEW.itinerary_item_id;
  IF t IS NULL OR NEW.trip_id IS DISTINCT FROM t THEN RAISE EXCEPTION 'Activity must belong to the selected trip'; END IF;
  IF TG_TABLE_NAME='journal_entries' AND (to_jsonb(NEW)->>'trip_day_id')::uuid IS DISTINCT FROM d THEN RAISE EXCEPTION 'Activity must belong to the selected day'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_planner_links ON public.memories;
CREATE TRIGGER validate_planner_links BEFORE INSERT OR UPDATE OF trip_id,itinerary_item_id ON public.memories FOR EACH ROW EXECUTE FUNCTION public.validate_planner_links();
DROP TRIGGER IF EXISTS validate_planner_links ON public.journal_entries;
CREATE TRIGGER validate_planner_links BEFORE INSERT OR UPDATE OF trip_id,trip_day_id,itinerary_item_id ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.validate_planner_links();
REVOKE ALL ON FUNCTION public.ensure_trip_days(uuid),public.create_trip_draft(uuid,jsonb),public.save_trip_activity(uuid,uuid,uuid,jsonb),public.move_trip_activity(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_trip_days(uuid),public.create_trip_draft(uuid,jsonb),public.save_trip_activity(uuid,uuid,uuid,jsonb),public.move_trip_activity(uuid,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';

-- Timeline and overview share existing day/activity records; no destructive replacement.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='itinerary_items' AND column_name='end_day_offset') THEN
  ALTER TABLE public.itinerary_items ADD COLUMN end_day_offset integer NOT NULL DEFAULT 0 CHECK(end_day_offset IN (0,1));
  -- Preserve existing overnight intervals explicitly when upgrading.
  UPDATE public.itinerary_items SET end_day_offset=1 WHERE end_time<start_time;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.validate_activity_interval() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE minutes integer;
BEGIN
 IF NEW.end_day_offset NOT IN (0,1) THEN RAISE EXCEPTION 'Invalid end day'; END IF;
 IF NEW.end_time IS NOT NULL THEN
  IF NEW.start_time IS NULL THEN RAISE EXCEPTION 'Start time is required with an end time'; END IF;
  minutes:=(extract(epoch FROM NEW.end_time-NEW.start_time)/60)::integer+NEW.end_day_offset*1440;
  IF minutes<=0 THEN RAISE EXCEPTION 'End must follow start; choose next day for overnight activities'; END IF;
  NEW.duration_minutes:=minutes;
 ELSIF NEW.end_day_offset<>0 THEN RAISE EXCEPTION 'End time is required for next-day ending';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_activity_interval ON public.itinerary_items;
CREATE TRIGGER validate_activity_interval BEFORE INSERT OR UPDATE OF start_time,end_time,end_day_offset,duration_minutes ON public.itinerary_items FOR EACH ROW EXECUTE FUNCTION public.validate_activity_interval();

CREATE OR REPLACE FUNCTION public.save_trip_activity(target_trip_id uuid,target_day_id uuid,activity_id uuid,details jsonb) RETURNS public.itinerary_items LANGUAGE plpgsql SET search_path=public AS $$
DECLARE result public.itinerary_items; prior public.itinerary_items;
BEGIN
 PERFORM 1 FROM public.trips WHERE id=target_trip_id AND user_id=auth.uid() AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.trip_days WHERE id=target_day_id AND trip_id=target_trip_id) THEN RAISE EXCEPTION 'Trip day unavailable'; END IF;
 IF coalesce(length(trim(details->>'title')),0) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'An activity title is required'; END IF;
 IF nullif(details->>'duration_minutes','')::integer IS NOT NULL AND (details->>'duration_minutes')::integer NOT BETWEEN 1 AND 2880 THEN RAISE EXCEPTION 'Duration must be between 1 and 2880 minutes'; END IF;
 SELECT * INTO prior FROM public.itinerary_items WHERE id=activity_id;
 IF FOUND AND NOT EXISTS(SELECT 1 FROM public.trip_days WHERE id=prior.trip_day_id AND trip_id=target_trip_id) THEN RAISE EXCEPTION 'Activity unavailable'; END IF;
 INSERT INTO public.itinerary_items(id,trip_day_id,title,description,start_time,end_time,end_day_offset,item_type,location_id,duration_minutes,location_name,time_label,booking_reference,status,sort_order)
 VALUES(activity_id,target_day_id,trim(details->>'title'),nullif(details->>'description',''),nullif(details->>'scheduled_time','')::time,nullif(details->>'end_time','')::time,coalesce((details->>'end_day_offset')::integer,0),coalesce(nullif(details->>'item_type',''),nullif(details->>'category',''),'activity'),nullif(details->>'location_id','')::uuid,nullif(details->>'duration_minutes','')::integer,nullif(details->>'location_name',''),nullif(details->>'time_label',''),nullif(details->>'booking_reference',''),coalesce(details->>'status','planned'),coalesce((SELECT max(sort_order)+1 FROM public.itinerary_items WHERE trip_day_id=target_day_id),0))
 ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,start_time=excluded.start_time,end_time=CASE WHEN details?'end_time' THEN excluded.end_time ELSE public.itinerary_items.end_time END,end_day_offset=CASE WHEN details?'end_day_offset' THEN excluded.end_day_offset ELSE public.itinerary_items.end_day_offset END,item_type=CASE WHEN details?'item_type' OR details?'category' THEN excluded.item_type ELSE public.itinerary_items.item_type END,duration_minutes=excluded.duration_minutes,location_name=excluded.location_name,time_label=excluded.time_label,booking_reference=excluded.booking_reference,status=excluded.status
 WHERE public.itinerary_items.trip_day_id=target_day_id RETURNING * INTO result;
 IF result.id IS NULL THEN RAISE EXCEPTION 'Use Move to day to move this activity'; END IF;
 RETURN result;
END $$;


CREATE OR REPLACE FUNCTION public.name_trip_day(target_trip_id uuid,target_day_id uuid,day_title text) RETURNS public.trip_days LANGUAGE plpgsql SET search_path=public AS $$
DECLARE result public.trip_days;
BEGIN
 PERFORM 1 FROM public.trips WHERE id=target_trip_id AND user_id=auth.uid() AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND OR length(coalesce(day_title,''))>120 THEN RAISE EXCEPTION 'Day unavailable or title too long'; END IF;
 UPDATE public.trip_days SET title=nullif(trim(day_title),'') WHERE id=target_day_id AND trip_id=target_trip_id AND NOT is_ideas RETURNING * INTO result;
 IF result.id IS NULL THEN RAISE EXCEPTION 'Day unavailable'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.name_trip_day(uuid,uuid,text),public.save_trip_activity(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.name_trip_day(uuid,uuid,text),public.save_trip_activity(uuid,uuid,uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.create_trip_draft(draft_id uuid,details jsonb) RETURNS public.trips LANGUAGE plpgsql SET search_path=public AS $$
DECLARE result public.trips; idea jsonb; ideas_day uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Sign in to create a trip'; END IF;
 IF coalesce(length(trim(details->>'title')),0) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'A trip name is required'; END IF;
 INSERT INTO public.trips(id,user_id,title,slug,destination,description,start_date,end_date,timezone)
 VALUES(draft_id,auth.uid(),trim(details->>'title'),'trip-'||draft_id,nullif(details->>'destination',''),nullif(details->>'description',''),nullif(details->>'start_date','')::date,nullif(details->>'end_date','')::date,nullif(details->>'timezone','')) ON CONFLICT(id) DO NOTHING;
 SELECT * INTO result FROM public.trips WHERE id=draft_id AND user_id=auth.uid() AND deleted_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trip unavailable'; END IF;
 PERFORM public.ensure_trip_days(result.id);
 IF jsonb_typeof(coalesce(details->'draft_ideas','[]'::jsonb)) IS DISTINCT FROM 'array' OR jsonb_array_length(coalesce(details->'draft_ideas','[]'::jsonb))>20 THEN RAISE EXCEPTION 'Keep up to 20 draft ideas'; END IF;
 SELECT id INTO ideas_day FROM public.trip_days WHERE trip_id=result.id AND is_ideas;
 FOR idea IN SELECT value FROM jsonb_array_elements(coalesce(details->'draft_ideas','[]'::jsonb)) LOOP
  IF nullif(idea->>'id','') IS NULL THEN RAISE EXCEPTION 'An idea ID is required'; END IF;
  PERFORM public.save_trip_activity(result.id,ideas_day,(idea->>'id')::uuid,jsonb_build_object('title',idea->>'title','status','planned'));
 END LOOP;
 RETURN result;
END $$;


REVOKE ALL ON FUNCTION public.create_trip_draft(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_trip_draft(uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';

COMMIT;
