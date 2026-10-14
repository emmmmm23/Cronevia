-- Compatibility seed: built-in files remain bundled; SQL rows support legacy placements.
INSERT INTO public.sticker_assets(user_id,storage_path,mime_type,width,height,category)
SELECT NULL, path, 'image/svg+xml', 100, 100, category FROM (VALUES
 ('heart-01.svg','hearts'),('heart-02.svg','hearts'),('star-01.svg','stars'),('star-02.svg','stars'),
 ('flower-01.svg','flowers'),('flower-02.svg','flowers'),('tape-01.svg','tape'),('tape-02.svg','tape'),
 ('leaf-01.svg','leaves'),('stamp-travel-01.svg','travel'),('doodle-abstract-01.svg','doodles'),('doodle-abstract-02.svg','doodles')
) AS builtins(path,category) ON CONFLICT(storage_path) DO NOTHING;

-- A single RPC is a single PostgreSQL transaction. Any failed insert rolls back the delete.
CREATE OR REPLACE FUNCTION public.replace_journal_stickers(target_entry_id uuid, placements jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE p jsonb; asset uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM id FROM public.journal_entries WHERE id=target_entry_id AND user_id=auth.uid() AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF jsonb_typeof(placements) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Placements must be an array'; END IF;
  IF jsonb_array_length(placements)>100 THEN RAISE EXCEPTION 'Too many placements'; END IF;
  DELETE FROM public.journal_sticker_placements WHERE journal_entry_id=target_entry_id;
  FOR p IN SELECT value FROM jsonb_array_elements(placements) LOOP
    IF left(p->>'sticker_asset_id',8)='builtin-' THEN
      SELECT id INTO asset FROM public.sticker_assets WHERE user_id IS NULL AND storage_path=substr(p->>'sticker_asset_id',9);
      IF asset IS NULL THEN RAISE EXCEPTION 'Unknown built-in sticker'; END IF;
    ELSE asset := (p->>'sticker_asset_id')::uuid;
    END IF;
    INSERT INTO public.journal_sticker_placements(id,journal_entry_id,sticker_asset_id,x,y,width,rotation,z_index)
    VALUES((p->>'id')::uuid,target_entry_id,asset,(p->>'x')::numeric,(p->>'y')::numeric,(p->>'width')::numeric,(p->>'rotation')::numeric,(p->>'z_index')::integer);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.replace_journal_stickers(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_journal_stickers(uuid,jsonb) TO authenticated;

-- Reusing the same draft ID makes retries safe even if the first response was lost.
CREATE OR REPLACE FUNCTION public.create_journal_draft(draft_id uuid,draft_title text,draft_content text,draft_date date)
RETURNS public.journal_entries LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE entry public.journal_entries;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.journal_entries(id,user_id,title,content,entry_date,visibility)
  VALUES(draft_id,auth.uid(),draft_title,draft_content,draft_date,'private') ON CONFLICT(id) DO NOTHING;
  SELECT * INTO entry FROM public.journal_entries WHERE id=draft_id AND user_id=auth.uid() AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Draft unavailable'; END IF;
  RETURN entry;
END $$;
REVOKE ALL ON FUNCTION public.create_journal_draft(uuid,text,text,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_journal_draft(uuid,text,text,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_memory_draft(draft_id uuid,draft_title text,draft_description text,draft_date date)
RETURNS public.memories LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE entry public.memories;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.memories(id,user_id,title,description,memory_date)
  VALUES(draft_id,auth.uid(),draft_title,draft_description,draft_date) ON CONFLICT(id) DO NOTHING;
  SELECT * INTO entry FROM public.memories WHERE id=draft_id AND user_id=auth.uid() AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Draft unavailable'; END IF;
  RETURN entry;
END $$;
REVOKE ALL ON FUNCTION public.create_memory_draft(uuid,text,text,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_memory_draft(uuid,text,text,date) TO authenticated;

NOTIFY pgrst, 'reload schema';
