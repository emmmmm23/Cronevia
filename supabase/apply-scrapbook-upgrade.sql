-- Idempotent upgrade for projects with the October 11 base schema.
BEGIN;
-- Sticker system: assets, placements, and storage buckets
-- Built-in stickers are public; custom uploads are private and user-scoped

-- Sticker assets table: reusable sticker images (built-in or user-uploaded)
CREATE TABLE IF NOT EXISTS sticker_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Storage reference
  storage_path TEXT NOT NULL,
  
  -- File metadata
  mime_type VARCHAR(100) NOT NULL,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  
  -- Category for organizing stickers
  category VARCHAR(50) DEFAULT 'other',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure storage_path is unique
  UNIQUE(storage_path)
);

-- Journal sticker placements: individual instances of stickers on journal pages
CREATE TABLE IF NOT EXISTS journal_sticker_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  sticker_asset_id UUID NOT NULL REFERENCES sticker_assets(id) ON DELETE CASCADE,
  
  -- Normalized coordinates (0-1 range, relative to page surface)
  x DECIMAL(10, 8) NOT NULL CHECK (x >= 0 AND x <= 1),
  y DECIMAL(10, 8) NOT NULL CHECK (y >= 0 AND y <= 1),
  
  -- Normalized width (0-1 range, relative to page width)
  width DECIMAL(10, 8) NOT NULL CHECK (width > 0 AND width <= 1),
  
  -- Rotation in degrees
  rotation DECIMAL(6, 2) NOT NULL DEFAULT 0 CHECK (rotation >= -360 AND rotation <= 360),
  
  -- Stacking order
  z_index INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add JSONB column for complete sticker layout data on journal entries
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS sticker_layout JSONB DEFAULT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sticker_assets_user_id ON sticker_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_sticker_assets_category ON sticker_assets(category);
CREATE INDEX IF NOT EXISTS idx_journal_sticker_placements_journal_entry_id ON journal_sticker_placements(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_sticker_placements_sticker_asset_id ON journal_sticker_placements(sticker_asset_id);

-- Enable RLS
ALTER TABLE sticker_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_sticker_placements ENABLE ROW LEVEL SECURITY;

-- Revoke default grants
REVOKE ALL ON sticker_assets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON journal_sticker_placements FROM PUBLIC, anon, authenticated;

-- Grant necessary privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON sticker_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_sticker_placements TO authenticated;

-- RLS Policies for sticker_assets
-- Built-in stickers (user_id IS NULL) are readable by all authenticated users
-- Custom stickers (user_id IS NOT NULL) follow owner_access pattern
DROP POLICY IF EXISTS sticker_assets_read ON sticker_assets;
CREATE POLICY sticker_assets_read ON sticker_assets
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR (user_id = auth.uid() AND public.is_account_active()));

DROP POLICY IF EXISTS sticker_assets_insert ON sticker_assets;
CREATE POLICY sticker_assets_insert ON sticker_assets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_account_active());

DROP POLICY IF EXISTS sticker_assets_update ON sticker_assets;
CREATE POLICY sticker_assets_update ON sticker_assets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_account_active())
  WITH CHECK (user_id = auth.uid() AND public.is_account_active());

DROP POLICY IF EXISTS sticker_assets_delete ON sticker_assets;
CREATE POLICY sticker_assets_delete ON sticker_assets
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_account_active());

-- RLS Policies for journal_sticker_placements
-- Users can only manage placements on journal entries they own
DROP POLICY IF EXISTS journal_sticker_placements_owner ON journal_sticker_placements;
CREATE POLICY journal_sticker_placements_owner ON journal_sticker_placements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_sticker_placements.journal_entry_id
        AND journal_entries.user_id = auth.uid()
        AND journal_entries.deleted_at IS NULL
    )
    AND public.is_account_active()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_sticker_placements.journal_entry_id
        AND journal_entries.user_id = auth.uid()
        AND journal_entries.deleted_at IS NULL
    )
    AND public.is_account_active()
  );

-- Storage buckets for stickers
-- Built-in stickers bucket (public read for authenticated users)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stickers-builtin',
  'stickers-builtin',
  false,  -- Not publicly accessible without auth
  1048576,  -- 1MB limit for built-in stickers
  ARRAY['image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Custom stickers bucket (private, user-scoped)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stickers-custom',
  'stickers-custom',
  false,
  5242880,  -- 5MB limit for custom uploads
  ARRAY['image/png', 'image/webp']  -- No SVG for user uploads initially
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for built-in stickers (read-only for authenticated users)
DROP POLICY IF EXISTS "Authenticated users can read builtin stickers" ON storage.objects;
CREATE POLICY "Authenticated users can read builtin stickers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'stickers-builtin');

-- Storage policies for custom stickers (user folders: {user_id}/filename.ext)
DROP POLICY IF EXISTS "Users can manage own custom stickers" ON storage.objects;
CREATE POLICY "Users can manage own custom stickers"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'stickers-custom'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_account_active()
)
WITH CHECK (
  bucket_id = 'stickers-custom'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_account_active()
);

-- Trigger to validate sticker placement references
CREATE OR REPLACE FUNCTION public.validate_sticker_placement() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  asset_owner uuid;
  entry_owner uuid;
BEGIN
  -- Get the owner of the sticker asset
  SELECT user_id INTO asset_owner
  FROM sticker_assets
  WHERE id = NEW.sticker_asset_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sticker asset not found';
  END IF;
  
  -- Get the owner of the journal entry
  SELECT user_id INTO entry_owner
  FROM journal_entries
  WHERE id = NEW.journal_entry_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found or deleted';
  END IF;
  
  -- If asset has an owner (not a built-in sticker), verify it matches entry owner
  IF asset_owner IS NOT NULL AND asset_owner IS DISTINCT FROM entry_owner THEN
    RAISE EXCEPTION 'Cannot place another user''s private sticker';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_sticker_placement ON journal_sticker_placements;
CREATE TRIGGER validate_sticker_placement
BEFORE INSERT OR UPDATE ON journal_sticker_placements
FOR EACH ROW EXECUTE FUNCTION public.validate_sticker_placement();

-- The legacy table has no updated_at column.
DROP TRIGGER IF EXISTS update_sticker_placements_updated_at ON journal_sticker_placements;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Run after 20261012000001_add_sticker_system.sql. Safe to reapply.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('stickers-custom','stickers-custom',false,5242880,ARRAY['image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Users can manage own custom stickers" ON storage.objects;
CREATE POLICY "Users can manage own custom stickers" ON storage.objects FOR ALL TO authenticated
USING(bucket_id='stickers-custom' AND (storage.foldername(name))[1]=auth.uid()::text AND public.is_account_active())
WITH CHECK(bucket_id='stickers-custom' AND (storage.foldername(name))[1]=auth.uid()::text AND public.is_account_active());

CREATE OR REPLACE FUNCTION public.validate_custom_sticker_path() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND split_part(NEW.storage_path,'/',1) IS DISTINCT FROM NEW.user_id::text THEN
    RAISE EXCEPTION 'Invalid sticker ownership path';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_custom_sticker_path ON public.sticker_assets;
CREATE TRIGGER validate_custom_sticker_path BEFORE INSERT OR UPDATE ON public.sticker_assets
FOR EACH ROW EXECUTE FUNCTION public.validate_custom_sticker_path();

ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS scrapbook_layout jsonb;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS scrapbook_layout jsonb;

CREATE OR REPLACE FUNCTION public.validate_scrapbook_layout() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE p jsonb; e jsonb; field text; seen text[] := '{}'; page_index integer := 0; aid uuid; asset_owner uuid; asset_path text;
BEGIN
  IF NEW.scrapbook_layout IS NULL THEN RETURN NEW; END IF;
  IF jsonb_typeof(NEW.scrapbook_layout) IS DISTINCT FROM 'object'
    OR NEW.scrapbook_layout->>'version' IS DISTINCT FROM '1'
    OR jsonb_typeof(NEW.scrapbook_layout->'pages') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid scrapbook version or pages'; END IF;
  IF jsonb_array_length(NEW.scrapbook_layout->'pages') <> 2 THEN RAISE EXCEPTION 'Two notebook pages required'; END IF;
  FOR p IN SELECT value FROM jsonb_array_elements(NEW.scrapbook_layout->'pages') LOOP
    page_index := page_index+1;
    IF p->>'id' IS DISTINCT FROM (ARRAY['page-left','page-right'])[page_index]
      OR jsonb_typeof(p->'elements') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid page'; END IF;
    IF jsonb_array_length(p->'elements') > 100 THEN RAISE EXCEPTION 'Too many decorations'; END IF;
    FOR e IN SELECT value FROM jsonb_array_elements(p->'elements') LOOP
      IF coalesce(e->>'id','')='' OR (e->>'id')=ANY(seen) THEN RAISE EXCEPTION 'Invalid placement ID'; END IF;
      seen:=array_append(seen,e->>'id');
      IF coalesce(e->>'type','') NOT IN ('sticker','photo') OR coalesce(e->>'frame','') NOT IN ('plain','polaroid','paper','washi') THEN RAISE EXCEPTION 'Invalid decoration type or frame'; END IF;
      FOREACH field IN ARRAY ARRAY['x','y','width','aspectRatio','rotation','zIndex'] LOOP
        IF jsonb_typeof(e->field) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid numeric geometry'; END IF;
      END LOOP;
      IF (e->>'x')::numeric NOT BETWEEN 0 AND 1 OR (e->>'y')::numeric NOT BETWEEN 0 AND 1
        OR (e->>'width')::numeric NOT BETWEEN .06 AND .8 OR (e->>'aspectRatio')::numeric NOT BETWEEN .1 AND 10
        OR (e->>'rotation')::numeric NOT BETWEEN -180 AND 180 OR (e->>'zIndex')::numeric NOT BETWEEN -10000 AND 10000
        OR (e->>'zIndex')::numeric <> trunc((e->>'zIndex')::numeric) THEN RAISE EXCEPTION 'Decoration geometry out of bounds'; END IF;
      IF e->>'type'='sticker' AND e->>'assetId' = ANY(ARRAY[
        'builtin-heart-01.svg','builtin-heart-02.svg','builtin-star-01.svg','builtin-star-02.svg',
        'builtin-flower-01.svg','builtin-flower-02.svg','builtin-tape-01.svg','builtin-tape-02.svg',
        'builtin-leaf-01.svg','builtin-stamp-travel-01.svg','builtin-doodle-abstract-01.svg','builtin-doodle-abstract-02.svg']) THEN CONTINUE; END IF;
      aid := (e->>'assetId')::uuid;
      asset_owner := NULL; asset_path := NULL;
      IF e->>'type'='photo' THEN
        SELECT user_id,storage_path INTO asset_owner,asset_path FROM public.media WHERE id=aid;
      ELSE
        SELECT user_id,storage_path INTO asset_owner,asset_path FROM public.sticker_assets WHERE id=aid;
      END IF;
      IF asset_owner IS DISTINCT FROM NEW.user_id OR asset_path IS NULL OR split_part(asset_path,'/',1) IS DISTINCT FROM NEW.user_id::text THEN
        RAISE EXCEPTION 'Decoration asset must belong to the record owner';
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_scrapbook_layout ON public.journal_entries;
CREATE TRIGGER validate_scrapbook_layout BEFORE INSERT OR UPDATE OF scrapbook_layout,user_id ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.validate_scrapbook_layout();
DROP TRIGGER IF EXISTS validate_scrapbook_layout ON public.memories;
CREATE TRIGGER validate_scrapbook_layout BEFORE INSERT OR UPDATE OF scrapbook_layout,user_id ON public.memories FOR EACH ROW EXECUTE FUNCTION public.validate_scrapbook_layout();

CREATE OR REPLACE FUNCTION public.protect_scrapbook_asset() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.journal_entries j, jsonb_array_elements(j.scrapbook_layout->'pages') p, jsonb_array_elements(p->'elements') e WHERE e->>'assetId'=OLD.id::text)
    OR EXISTS(SELECT 1 FROM public.memories m, jsonb_array_elements(m.scrapbook_layout->'pages') p, jsonb_array_elements(p->'elements') e WHERE e->>'assetId'=OLD.id::text) THEN
    RAISE EXCEPTION 'Remove saved scrapbook placements before deleting this asset';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS protect_scrapbook_asset ON public.media;
CREATE TRIGGER protect_scrapbook_asset BEFORE DELETE ON public.media FOR EACH ROW EXECUTE FUNCTION public.protect_scrapbook_asset();
DROP TRIGGER IF EXISTS protect_scrapbook_asset ON public.sticker_assets;
CREATE TRIGGER protect_scrapbook_asset BEFORE DELETE ON public.sticker_assets FOR EACH ROW EXECUTE FUNCTION public.protect_scrapbook_asset();

DROP TRIGGER IF EXISTS update_sticker_placements_updated_at ON public.journal_sticker_placements;
NOTIFY pgrst, 'reload schema';

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

NOTIFY pgrst, 'reload schema';
COMMIT;
