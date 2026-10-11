CREATE INDEX IF NOT EXISTS trips_owner_date ON public.trips(user_id,start_date DESC) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS trips_live_slug ON public.trips(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS journals_owner_date ON public.journal_entries(user_id,entry_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS memories_owner_date ON public.memories(user_id,memory_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS media_journal ON public.media(journal_entry_id);
CREATE INDEX IF NOT EXISTS media_trip ON public.media(trip_id);
CREATE INDEX IF NOT EXISTS media_memory ON public.media(memory_id);
CREATE INDEX IF NOT EXISTS media_owner ON public.media(user_id);
CREATE INDEX IF NOT EXISTS itinerary_day_order ON public.itinerary_items(trip_day_id,sort_order);

CREATE OR REPLACE FUNCTION public.get_on_this_day() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(matches)), '[]'::jsonb) FROM (
    SELECT id,title,entry_date AS memory_date,'journal'::text AS type FROM public.journal_entries
    WHERE user_id=auth.uid() AND deleted_at IS NULL AND NOT is_archived AND entry_date<date_trunc('year',current_date)
      AND to_char(entry_date,'MM-DD')=to_char(current_date,'MM-DD')
    UNION ALL
    SELECT id,title,memory_date,'memory'::text FROM public.memories
    WHERE user_id=auth.uid() AND deleted_at IS NULL AND NOT is_archived AND memory_date<date_trunc('year',current_date)
      AND to_char(memory_date,'MM-DD')=to_char(current_date,'MM-DD')
  ) matches;
$$;
REVOKE ALL ON FUNCTION public.get_on_this_day() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_on_this_day() TO authenticated;
NOTIFY pgrst,'reload schema';
