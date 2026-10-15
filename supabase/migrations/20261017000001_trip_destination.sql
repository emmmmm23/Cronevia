-- Additive destination pins. Existing text-only trips remain valid. RLS is unchanged.
BEGIN;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS destination_latitude double precision;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS destination_longitude double precision;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS destination_source text;
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_destination_pin;
ALTER TABLE public.trips ADD CONSTRAINT trips_destination_pin CHECK (
 (destination_latitude IS NULL AND destination_longitude IS NULL AND destination_source IS NULL)
 OR (destination_latitude IS NOT NULL AND destination_longitude IS NOT NULL AND destination_source IS NOT NULL
 AND destination_latitude BETWEEN -90 AND 90 AND destination_longitude BETWEEN -180 AND 180
 AND destination_source IN ('search','map','gps'))
);
CREATE OR REPLACE FUNCTION public.create_trip_draft(draft_id uuid,details jsonb) RETURNS public.trips LANGUAGE plpgsql SET search_path=public AS $$
DECLARE result public.trips; idea jsonb; ideas_day uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Sign in to create a trip'; END IF;
 IF coalesce(length(trim(details->>'title')),0) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'A trip name is required'; END IF;
 INSERT INTO public.trips(id,user_id,title,slug,destination,description,start_date,end_date,timezone,destination_latitude,destination_longitude,destination_source)
 VALUES(draft_id,auth.uid(),trim(details->>'title'),'trip-'||draft_id,nullif(details->>'destination',''),nullif(details->>'description',''),nullif(details->>'start_date','')::date,nullif(details->>'end_date','')::date,nullif(details->>'timezone',''),nullif(details->>'destination_latitude','')::double precision,nullif(details->>'destination_longitude','')::double precision,nullif(details->>'destination_source','')) ON CONFLICT(id) DO NOTHING;
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
