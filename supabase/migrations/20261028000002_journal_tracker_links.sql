-- Live journal references share the tracker records; no tracker values are copied into journal content.
BEGIN;
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
COMMIT;
