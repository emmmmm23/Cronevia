-- Private, immutable profile photographs and allowlisted frame/crop preferences.
BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_storage_path text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_source_path text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_appearance jsonb NOT NULL DEFAULT
'{"version":1,"frame":{"preset":"none","primary":"#79283e","secondary":"#c6a15b","accent":"#77916b","thickness":3,"gap":2},"crop":{"zoom":1,"x":0,"y":0,"rotation":0}}';

CREATE OR REPLACE FUNCTION public.valid_avatar_appearance(a jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE f jsonb:=a->'frame'; c jsonb:=a->'crop'; k text;
BEGIN
 IF a IS NULL OR octet_length(a::text)>1500 OR jsonb_typeof(a)<>'object'
 OR a-ARRAY['version','frame','crop']<>'{}'::jsonb OR a->'version'<>'1'::jsonb
 OR NOT (a ?& ARRAY['version','frame','crop'])
 OR jsonb_typeof(f)<>'object' OR f-ARRAY['preset','primary','secondary','accent','thickness','gap']<>'{}'::jsonb
 OR NOT (f ?& ARRAY['preset','primary','secondary','accent','thickness','gap'])
 OR jsonb_typeof(c)<>'object' OR c-ARRAY['zoom','x','y','rotation']<>'{}'::jsonb
 OR NOT (c ?& ARRAY['zoom','x','y','rotation']) THEN RETURN false; END IF;
 IF jsonb_typeof(f->'preset')<>'string' OR NOT (f->>'preset'=ANY(ARRAY['none','solid','double','dotted','dashed','pastel','burgundy-gold','hand-drawn','stitched','postage','floral','stars','scrapbook'])) THEN RETURN false; END IF;
 FOREACH k IN ARRAY ARRAY['primary','secondary','accent'] LOOP
  IF jsonb_typeof(f->k)<>'string' OR (f->>k)!~'^#[0-9A-Fa-f]{6}$' THEN RETURN false; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['thickness','gap'] LOOP
  IF jsonb_typeof(f->k)<>'number' THEN RETURN false; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['zoom','x','y','rotation'] LOOP
  IF jsonb_typeof(c->k)<>'number' THEN RETURN false; END IF;
 END LOOP;
 RETURN (f->>'thickness')::numeric BETWEEN 1 AND 8 AND (f->>'gap')::numeric BETWEEN 0 AND 10
 AND (c->>'zoom')::numeric BETWEEN 1 AND 4 AND (c->>'x')::numeric BETWEEN -1 AND 1
 AND (c->>'y')::numeric BETWEEN -1 AND 1 AND (c->>'rotation')::numeric IN (0,90,180,270);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_profile_avatar;
ALTER TABLE public.profiles ADD CONSTRAINT valid_profile_avatar CHECK(public.valid_avatar_appearance(avatar_appearance));

-- Identity/role guards and existing row visibility remain in force. Only the
-- owner-only function below can write storage references or appearance data.
REVOKE UPDATE, INSERT ON public.profiles FROM authenticated;
GRANT UPDATE(full_name,username,bio,timezone,locale,account_status,updated_at) ON public.profiles TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('cronevia-avatars','cronevia-avatars',false,2097152,ARRAY['image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=2097152,allowed_mime_types=ARRAY['image/png','image/webp'];
DROP POLICY IF EXISTS avatar_read ON storage.objects;
CREATE POLICY avatar_read ON storage.objects FOR SELECT TO authenticated USING(
 bucket_id='cronevia-avatars' AND public.is_account_active() AND
 (split_part(name,'/',1)=auth.uid()::text OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.avatar_storage_path=name))
);
DROP POLICY IF EXISTS avatar_insert ON storage.objects;
CREATE POLICY avatar_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(
 bucket_id='cronevia-avatars' AND public.is_account_active() AND
 name ~ ('^'||auth.uid()::text||'/avatars/[0-9a-f-]{36}/(avatar|source)\.(png|webp)$')
);
DROP POLICY IF EXISTS avatar_delete ON storage.objects;
CREATE POLICY avatar_delete ON storage.objects FOR DELETE TO authenticated USING(
 bucket_id='cronevia-avatars' AND public.is_account_active() AND split_part(name,'/',1)=auth.uid()::text
 AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND (p.avatar_storage_path=name OR p.avatar_source_path=name))
);

CREATE OR REPLACE FUNCTION public.save_profile_avatar(expected_revision bigint, appearance jsonb,
 photo_path text, source_path text, remove_photo boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,storage AS $$
DECLARE p public.profiles; old_paths text[]; path text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_account_active() THEN RAISE EXCEPTION 'Finish signing in to edit your avatar.' USING ERRCODE='42501'; END IF;
 IF NOT public.valid_avatar_appearance(appearance) THEN RAISE EXCEPTION 'Invalid avatar appearance.' USING ERRCODE='22023'; END IF;
 SELECT * INTO STRICT p FROM public.profiles WHERE user_id=auth.uid() FOR UPDATE;
 IF p.avatar_revision<>expected_revision THEN RAISE EXCEPTION 'Your avatar changed in another tab. Close this editor and try again.' USING ERRCODE='40001'; END IF;
 old_paths:=ARRAY[p.avatar_storage_path,p.avatar_source_path];
 IF remove_photo THEN photo_path:=NULL;source_path:=NULL;
 ELSE
  IF (photo_path IS NULL)<>(source_path IS NULL) THEN RAISE EXCEPTION 'Both photo references are required.'; END IF;
  FOREACH path IN ARRAY ARRAY[photo_path,source_path] LOOP
   IF path IS NULL THEN CONTINUE; END IF;
   IF path !~ ('^'||auth.uid()::text||'/avatars/[0-9a-f-]{36}/(avatar|source)\.(png|webp)$') THEN RAISE EXCEPTION 'Invalid photo owner or path.' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM storage.objects o WHERE o.bucket_id='cronevia-avatars' AND o.name=path
    AND o.metadata->>'mimetype' IN ('image/png','image/webp') AND (o.metadata->>'size')::bigint BETWEEN 1 AND 2097152 FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Upload the photo before saving.'; END IF;
  END LOOP;
  IF photo_path IS NOT NULL AND (photo_path !~ '/avatar\.(png|webp)$' OR source_path !~ '/source\.(png|webp)$') THEN RAISE EXCEPTION 'Invalid photo references.'; END IF;
 END IF;
 UPDATE public.profiles SET avatar_storage_path=photo_path,avatar_source_path=source_path,
  avatar_url=CASE WHEN remove_photo OR photo_path IS NOT NULL THEN NULL ELSE avatar_url END,
  avatar_appearance=appearance,avatar_revision=avatar_revision+1 WHERE user_id=auth.uid() RETURNING * INTO p;
 RETURN jsonb_build_object('profile',to_jsonb(p),'retired_paths',to_jsonb(old_paths));
END $$;
REVOKE ALL ON FUNCTION public.save_profile_avatar(bigint,jsonb,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_profile_avatar(bigint,jsonb,text,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.avatar_schema_version() RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 20261028.5 $$;
GRANT EXECUTE ON FUNCTION public.avatar_schema_version() TO anon,authenticated;
COMMIT;
