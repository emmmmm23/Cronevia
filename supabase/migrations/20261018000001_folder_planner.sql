-- Folder-first planning extends existing trips, days and activities. No data is removed.
BEGIN;
ALTER TABLE public.trip_days ADD COLUMN IF NOT EXISTS explicit_date boolean NOT NULL DEFAULT false;
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS location_source text;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.itinerary_items'::regclass AND conname='itinerary_pin_complete') THEN
  ALTER TABLE public.itinerary_items ADD CONSTRAINT itinerary_pin_complete CHECK (
   (latitude IS NULL AND longitude IS NULL AND location_source IS NULL) OR
   (latitude IS NOT NULL AND longitude IS NOT NULL AND location_source IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND location_source IN ('search','map','gps'))
  );
 END IF;
END $$;

-- Explicitly chosen stop dates must not shift when optional trip dates change.
CREATE OR REPLACE FUNCTION public.sync_trip_dates() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.start_date IS NOT DISTINCT FROM OLD.start_date AND NEW.end_date IS NOT DISTINCT FROM OLD.end_date THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  UPDATE public.trip_days SET date=NEW.start_date+day_number-1 WHERE trip_id=NEW.id AND NOT is_ideas AND NOT explicit_date;
 END IF;
 PERFORM public.ensure_trip_days(NEW.id);
 RETURN NEW;
END $$;

-- Stable activity_id makes an uncertain-response retry an update, never a duplicate.
-- Runs as the signed-in caller: all existing RLS policies remain in force.
CREATE OR REPLACE FUNCTION public.save_trip_place(target_trip_id uuid,activity_id uuid,place_date date,details jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE target public.trip_days; prior public.itinerary_items; saved public.itinerary_items;
BEGIN
 PERFORM 1 FROM public.trips WHERE id=target_trip_id AND user_id=auth.uid() AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Trip unavailable'; END IF;
 SELECT * INTO prior FROM public.itinerary_items WHERE id=activity_id;
 IF FOUND AND NOT EXISTS(SELECT 1 FROM public.trip_days WHERE id=prior.trip_day_id AND trip_id=target_trip_id) THEN RAISE EXCEPTION 'Place unavailable'; END IF;
 SELECT * INTO target FROM public.trip_days WHERE trip_id=target_trip_id AND NOT is_ideas AND date IS NOT DISTINCT FROM place_date ORDER BY day_number LIMIT 1;
 IF target.id IS NULL THEN
  INSERT INTO public.trip_days(trip_id,day_number,date,explicit_date)
  SELECT target_trip_id,coalesce(max(day_number),0)+1,place_date,true FROM public.trip_days WHERE trip_id=target_trip_id RETURNING * INTO target;
 ELSE
  UPDATE public.trip_days SET explicit_date=true WHERE id=target.id RETURNING * INTO target;
 END IF;
 IF prior.id IS NOT NULL AND prior.trip_day_id<>target.id THEN PERFORM public.move_trip_activity(activity_id,target.id); END IF;
 -- This editor submits a complete time interval, including when it becomes flexible.
 details:=jsonb_build_object('end_time',NULL,'end_day_offset',0)||details;
 saved:=public.save_trip_activity(target_trip_id,target.id,activity_id,details);
 -- An edited address clears any old joined location. Omitted fields preserve legacy pins.
 IF details?'latitude' OR details?'longitude' OR details?'location_source' THEN
  UPDATE public.itinerary_items SET latitude=nullif(details->>'latitude','')::double precision,
   longitude=nullif(details->>'longitude','')::double precision,location_source=nullif(details->>'location_source',''),location_id=NULL
   WHERE id=activity_id RETURNING * INTO saved;
 END IF;
 RETURN jsonb_build_object('item',to_jsonb(saved),'day',to_jsonb(target));
END $$;
REVOKE ALL ON FUNCTION public.save_trip_place(uuid,uuid,date,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_trip_place(uuid,uuid,date,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.trip_folder_summaries() RETURNS TABLE(trip_id uuid,place_count bigint,first_date date,last_date date)
LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT t.id,count(i.id),min(d.date) FILTER(WHERE i.id IS NOT NULL AND NOT d.is_ideas),max(d.date) FILTER(WHERE i.id IS NOT NULL AND NOT d.is_ideas)
 FROM public.trips t LEFT JOIN public.trip_days d ON d.trip_id=t.id LEFT JOIN public.itinerary_items i ON i.trip_day_id=d.id
 WHERE t.user_id=auth.uid() AND t.deleted_at IS NULL GROUP BY t.id;
$$;
REVOKE ALL ON FUNCTION public.trip_folder_summaries() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.trip_folder_summaries() TO authenticated;

-- Old trips can have several undated day records. Reorder the visible date group
-- without moving/deleting those days or changing any linked journal references.
CREATE OR REPLACE FUNCTION public.reorder_trip_places(target_trip_id uuid,place_date date,item_ids uuid[])
RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE expected integer;
BEGIN
 PERFORM 1 FROM public.trips WHERE id=target_trip_id AND user_id=auth.uid() AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trip unavailable'; END IF;
 SELECT count(*) INTO expected FROM public.itinerary_items i JOIN public.trip_days d ON d.id=i.trip_day_id
 WHERE d.trip_id=target_trip_id AND i.start_time IS NULL AND (CASE WHEN d.is_ideas THEN NULL ELSE d.date END) IS NOT DISTINCT FROM place_date;
 IF coalesce(cardinality(item_ids),0)<>expected OR (SELECT count(DISTINCT id) FROM unnest(item_ids) id)<>expected
 OR EXISTS(SELECT 1 FROM unnest(item_ids) AS candidate(item_id) WHERE NOT EXISTS(
  SELECT 1 FROM public.itinerary_items i JOIN public.trip_days d ON d.id=i.trip_day_id WHERE i.id=candidate.item_id AND d.trip_id=target_trip_id AND i.start_time IS NULL AND (CASE WHEN d.is_ideas THEN NULL ELSE d.date END) IS NOT DISTINCT FROM place_date))
 THEN RAISE EXCEPTION 'Reload the date group before reordering'; END IF;
 UPDATE public.itinerary_items i SET sort_order=o.position::integer FROM unnest(item_ids) WITH ORDINALITY o(id,position) WHERE i.id=o.id;
END $$;
REVOKE ALL ON FUNCTION public.reorder_trip_places(uuid,date,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reorder_trip_places(uuid,date,uuid[]) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
