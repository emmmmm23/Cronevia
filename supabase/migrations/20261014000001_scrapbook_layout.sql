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
