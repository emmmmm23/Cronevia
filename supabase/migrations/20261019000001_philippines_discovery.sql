-- Optional discovery metadata; manual trip and place saves keep their existing RPCs.
BEGIN;
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS place_provider text;
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS provider_place_id text;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.itinerary_items'::regclass AND conname='itinerary_provider_pair') THEN
  ALTER TABLE public.itinerary_items ADD CONSTRAINT itinerary_provider_pair CHECK (
   (place_provider IS NULL AND provider_place_id IS NULL) OR
   (place_provider IS NOT NULL AND provider_place_id IS NOT NULL AND length(place_provider) BETWEEN 1 AND 40 AND length(provider_place_id) BETWEEN 1 AND 2048));
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.save_discovered_trip_place(target_trip_id uuid,activity_id uuid,place_date date,details jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE result jsonb; saved public.itinerary_items;
BEGIN
 -- Existing RPC authenticates, locks the owned parent, validates times/pins and uses stable IDs.
 result:=public.save_trip_place(target_trip_id,activity_id,place_date,details);
 UPDATE public.itinerary_items SET place_provider=nullif(details->>'place_provider',''),provider_place_id=nullif(details->>'provider_place_id','')
 WHERE id=activity_id RETURNING * INTO saved;
 RETURN jsonb_set(result,'{item}',to_jsonb(saved));
END $$;
REVOKE ALL ON FUNCTION public.save_discovered_trip_place(uuid,uuid,date,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_discovered_trip_place(uuid,uuid,date,jsonb) TO authenticated;
-- Editing a discovered location manually clears its previous provider identity.
CREATE OR REPLACE FUNCTION public.clear_changed_place_provider() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude OR NEW.location_name IS DISTINCT FROM OLD.location_name THEN
  NEW.place_provider:=NULL; NEW.provider_place_id:=NULL;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS clear_changed_place_provider ON public.itinerary_items;
CREATE TRIGGER clear_changed_place_provider BEFORE UPDATE OF latitude,longitude,location_name ON public.itinerary_items
FOR EACH ROW EXECUTE FUNCTION public.clear_changed_place_provider();
NOTIFY pgrst,'reload schema';
COMMIT;
