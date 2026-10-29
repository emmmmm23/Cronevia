-- Additive journal sharing. Existing entry IDs, owners and visibility are preserved.
BEGIN;
CREATE TABLE IF NOT EXISTS public.journals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 title text NOT NULL DEFAULT 'My journal' CHECK(length(btrim(title)) BETWEEN 1 AND 120),
 share_future boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.journal_members (
 journal_id uuid NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('viewer','editor')), joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(journal_id,user_id)
);
CREATE INDEX IF NOT EXISTS journal_members_user_idx ON public.journal_members(user_id,journal_id);
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS journal_id uuid REFERENCES public.journals(id) ON DELETE CASCADE;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
INSERT INTO public.journals(owner_id) SELECT DISTINCT user_id FROM public.journal_entries ON CONFLICT(owner_id) DO NOTHING;
ALTER TABLE public.journal_entries DISABLE TRIGGER update_journal_entries_updated_at;
UPDATE public.journal_entries e SET journal_id=j.id FROM public.journals j WHERE e.journal_id IS NULL AND j.owner_id=e.user_id;
ALTER TABLE public.journal_entries ENABLE TRIGGER update_journal_entries_updated_at;
CREATE INDEX IF NOT EXISTS journal_entries_journal_idx ON public.journal_entries(journal_id,entry_date DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS cronevia_private.journal_invites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), journal_id uuid NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[0-9a-f]{64}$'), role text NOT NULL CHECK(role IN ('viewer','editor')),
 created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days', revoked_at timestamptz,
 accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, accepted_at timestamptz
);
CREATE TABLE IF NOT EXISTS cronevia_private.journal_invite_claims (
 claim_hash text PRIMARY KEY CHECK(claim_hash ~ '^[0-9a-f]{64}$'),
 invite_id uuid NOT NULL REFERENCES cronevia_private.journal_invites(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS journal_invite_claims_invite_idx ON cronevia_private.journal_invite_claims(invite_id);
CREATE TABLE IF NOT EXISTS cronevia_private.journal_quotas (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, action text NOT NULL,
 window_start timestamptz NOT NULL, used integer NOT NULL, PRIMARY KEY(user_id,action)
);
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronevia_private.journal_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronevia_private.journal_invite_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronevia_private.journal_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.journals,public.journal_members FROM anon,authenticated;
GRANT SELECT ON public.journals,public.journal_members TO authenticated;
REVOKE ALL ON cronevia_private.journal_invites,cronevia_private.journal_invite_claims,cronevia_private.journal_quotas FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.journal_role(target_journal uuid) RETURNS text
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN j.owner_id=auth.uid() THEN 'owner' ELSE m.role END
 FROM public.journals j LEFT JOIN public.journal_members m ON m.journal_id=j.id AND m.user_id=auth.uid()
 WHERE j.id=target_journal AND j.deleted_at IS NULL AND public.is_account_active()
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=j.owner_id AND p.account_status='active')
$$;
CREATE OR REPLACE FUNCTION public.can_read_journal_entry(target_entry uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.journal_entries e WHERE e.id=target_entry
 AND (public.journal_role(e.journal_id)='owner' OR
 (public.journal_role(e.journal_id) IN ('viewer','editor') AND e.visibility='friends' AND NOT e.is_archived AND e.deleted_at IS NULL
 AND (e.status='published' OR (e.status='draft' AND e.last_edited_by=auth.uid() AND public.journal_role(e.journal_id)='editor')))))
$$;
CREATE OR REPLACE FUNCTION public.can_edit_journal_entry(target_entry uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.journal_entries e WHERE e.id=target_entry AND e.deleted_at IS NULL
 AND (public.journal_role(e.journal_id)='owner' OR
 (public.journal_role(e.journal_id)='editor' AND e.visibility='friends' AND NOT e.is_archived
 AND (e.status='published' OR (e.status='draft' AND e.last_edited_by=auth.uid())))))
$$;
CREATE POLICY journal_read ON public.journals FOR SELECT TO authenticated USING(public.journal_role(id) IS NOT NULL);
CREATE POLICY journal_member_read ON public.journal_members FOR SELECT TO authenticated
 USING(user_id=auth.uid() AND public.journal_role(journal_id) IS NOT NULL OR public.journal_role(journal_id)='owner');
CREATE POLICY journal_shared_entry_read ON public.journal_entries FOR SELECT TO authenticated USING(public.can_read_journal_entry(id));
-- Restrictive scope also constrains older owner/admin policies when a journal has been removed.
CREATE POLICY journal_entry_scope ON public.journal_entries AS RESTRICTIVE FOR SELECT TO authenticated USING(public.journal_role(journal_id)='owner' OR (public.journal_role(journal_id) IN ('viewer','editor') AND visibility='friends' AND NOT is_archived AND deleted_at IS NULL AND (status='published' OR (status='draft' AND last_edited_by=auth.uid() AND public.journal_role(journal_id)='editor'))));

CREATE OR REPLACE FUNCTION public.ensure_my_journal() RETURNS public.journals
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.journals;
BEGIN
 IF NOT public.is_account_active() THEN RAISE EXCEPTION 'Sign in to open your journal' USING ERRCODE='42501'; END IF;
 INSERT INTO public.journals(owner_id) VALUES(auth.uid()) ON CONFLICT(owner_id) DO NOTHING;
 SELECT * INTO j FROM public.journals WHERE owner_id=auth.uid();
 IF j.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'This journal is no longer available' USING ERRCODE='42501'; END IF;
 RETURN j;
END $$;
CREATE OR REPLACE FUNCTION public.list_my_journals() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.ensure_my_journal();
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',j.id,'title',j.title,'owner_id',j.owner_id,
 'role',public.journal_role(j.id),'share_future',j.share_future,'shared',EXISTS(SELECT 1 FROM public.journal_members m WHERE m.journal_id=j.id)))
 FROM public.journals j WHERE public.journal_role(j.id) IS NOT NULL),'[]');
END $$;
CREATE OR REPLACE FUNCTION cronevia_private.journal_quota(kind text,maximum integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer;
BEGIN
 IF NOT public.is_account_active() THEN RAISE EXCEPTION 'Sign in to continue' USING ERRCODE='42501'; END IF;
 INSERT INTO cronevia_private.journal_quotas AS q VALUES(auth.uid(),kind,clock_timestamp(),1)
 ON CONFLICT(user_id,action) DO UPDATE SET
 used=CASE WHEN q.window_start<clock_timestamp()-interval '1 minute' THEN 1 ELSE q.used+1 END,
 window_start=CASE WHEN q.window_start<clock_timestamp()-interval '1 minute' THEN clock_timestamp() ELSE q.window_start END RETURNING used INTO n;
 IF n>maximum THEN RAISE EXCEPTION 'Please wait a minute before trying again' USING ERRCODE='P0001'; END IF;
END $$;
REVOKE ALL ON FUNCTION cronevia_private.journal_quota(text,integer) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_journal_invite(target_journal uuid,invited_role text,share_future_entries boolean DEFAULT false,journal_title text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE token text; i cronevia_private.journal_invites;
BEGIN
 PERFORM cronevia_private.journal_quota('create',10);
 PERFORM 1 FROM public.journals WHERE id=target_journal FOR UPDATE;
 IF public.journal_role(target_journal) IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Only the journal owner can invite people' USING ERRCODE='42501'; END IF;
 IF invited_role NOT IN ('viewer','editor') OR invited_role IS NULL THEN RAISE EXCEPTION 'Choose Viewer or Editor' USING ERRCODE='22023'; END IF;
 IF journal_title IS NOT NULL AND length(btrim(journal_title)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Use a journal name between 1 and 120 characters' USING ERRCODE='22023'; END IF;
 token:=replace(gen_random_uuid()::text||gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 INSERT INTO cronevia_private.journal_invites(journal_id,token_hash,role,created_by)
 VALUES(target_journal,encode(sha256(convert_to(token,'UTF8')),'hex'),invited_role,auth.uid()) RETURNING * INTO i;
 UPDATE public.journals SET share_future=share_future_entries,title=COALESCE(btrim(journal_title),title) WHERE id=target_journal;
 RETURN jsonb_build_object('id',i.id,'token',token,'role',i.role,'expires_at',i.expires_at);
END $$;

-- Anonymous exchange accepts digests only, never grants journal access or creates membership.
CREATE OR REPLACE FUNCTION public.exchange_journal_invite(invite_digest text,claim_digest text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i cronevia_private.journal_invites;
BEGIN
 IF invite_digest !~ '^[0-9a-f]{64}$' OR claim_digest !~ '^[0-9a-f]{64}$' OR invite_digest IS NULL OR claim_digest IS NULL THEN RETURN jsonb_build_object('status','invalid'); END IF;
 SELECT * INTO i FROM cronevia_private.journal_invites WHERE token_hash=invite_digest FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','invalid'); END IF;
 DELETE FROM cronevia_private.journal_invite_claims WHERE expires_at<now();
 IF (SELECT count(*) FROM cronevia_private.journal_invite_claims WHERE invite_id=i.id AND created_at>now()-interval '1 minute')>=30
 THEN RETURN jsonb_build_object('status','limited'); END IF;
 INSERT INTO cronevia_private.journal_invite_claims(claim_hash,invite_id,expires_at) VALUES(claim_digest,i.id,i.expires_at) ON CONFLICT DO NOTHING;
 RETURN jsonb_build_object('status','exchanged','invitation_id',i.id);
END $$;
CREATE OR REPLACE FUNCTION public.journal_invite_context(claim_digest text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i cronevia_private.journal_invites; member_role text; j public.journals;
BEGIN
 SELECT x.* INTO i FROM cronevia_private.journal_invites x JOIN cronevia_private.journal_invite_claims c ON c.invite_id=x.id WHERE c.claim_hash=claim_digest;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','invalid'); END IF;
 SELECT * INTO j FROM public.journals WHERE id=i.journal_id AND deleted_at IS NULL;
 IF NOT FOUND OR j.owner_id<>i.created_by OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=j.owner_id AND account_status='active') THEN RETURN jsonb_build_object('status','unavailable'); END IF;
 member_role:=public.journal_role(i.journal_id);
 IF member_role IS NOT NULL THEN RETURN jsonb_build_object('status','member','journal_id',i.journal_id,'role',member_role,'invitation_id',i.id); END IF;
 IF i.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('status','revoked'); END IF;
 IF i.accepted_at IS NOT NULL THEN RETURN jsonb_build_object('status','used'); END IF;
 IF i.expires_at<=now() THEN RETURN jsonb_build_object('status','expired'); END IF;
 RETURN jsonb_build_object('status','pending','role',i.role,'invitation_id',i.id,
 'journal_title',CASE WHEN public.is_account_active() THEN j.title ELSE NULL END,'expires_at',i.expires_at);
END $$;
CREATE OR REPLACE FUNCTION public.accept_journal_invite(claim_digest text,expected_invitation uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i cronevia_private.journal_invites; context jsonb;
BEGIN
 PERFORM cronevia_private.journal_quota('accept',20);
 SELECT x.* INTO i FROM cronevia_private.journal_invites x JOIN cronevia_private.journal_invite_claims c ON c.invite_id=x.id
 WHERE c.claim_hash=claim_digest;
 IF NOT FOUND OR i.id IS DISTINCT FROM expected_invitation THEN RETURN jsonb_build_object('status','invalid'); END IF;
 PERFORM 1 FROM public.journals WHERE id=i.journal_id FOR UPDATE;
 SELECT * INTO i FROM cronevia_private.journal_invites WHERE id=i.id FOR UPDATE;
 context:=public.journal_invite_context(claim_digest);
 IF context->>'status'='member' THEN RETURN context; END IF;
 IF context->>'status' IS DISTINCT FROM 'pending' THEN RETURN context; END IF;
 INSERT INTO public.journal_members(journal_id,user_id,role) VALUES(i.journal_id,auth.uid(),i.role) ON CONFLICT DO NOTHING;
 UPDATE cronevia_private.journal_invites SET accepted_at=now(),accepted_by=auth.uid() WHERE id=i.id;
 RETURN jsonb_build_object('status','accepted','journal_id',i.journal_id,'role',public.journal_role(i.journal_id));
END $$;
CREATE OR REPLACE FUNCTION public.journal_sharing_details(target_journal uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF public.journal_role(target_journal) IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Owner access required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('invitations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'role',i.role,'created_at',i.created_at,'expires_at',i.expires_at,
 'status',CASE WHEN revoked_at IS NOT NULL THEN 'revoked' WHEN accepted_at IS NOT NULL THEN 'accepted' WHEN expires_at<=now() THEN 'expired' ELSE 'pending' END))
 FROM cronevia_private.journal_invites i WHERE journal_id=target_journal),'[]'),
 'members',COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'name',COALESCE(nullif(p.full_name,''),'Journal member')))
 FROM public.journal_members m LEFT JOIN public.profiles p ON p.user_id=m.user_id WHERE m.journal_id=target_journal),'[]'),
 'private_count',(SELECT count(*) FROM public.journal_entries WHERE journal_id=target_journal AND visibility<>'friends' AND deleted_at IS NULL));
END $$;
CREATE OR REPLACE FUNCTION public.manage_journal_sharing(target_journal uuid,action text,target_id uuid,new_role text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM cronevia_private.journal_quota('manage',30);
 PERFORM 1 FROM public.journals WHERE id=target_journal FOR UPDATE;
 IF action='leave' AND target_id=auth.uid() AND public.journal_role(target_journal) IN ('viewer','editor') THEN
 DELETE FROM public.journal_members WHERE journal_id=target_journal AND user_id=auth.uid(); RETURN;
 END IF;
 IF public.journal_role(target_journal) IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Owner access required' USING ERRCODE='42501'; END IF;
 IF action='revoke' THEN UPDATE cronevia_private.journal_invites SET revoked_at=COALESCE(revoked_at,now()) WHERE journal_id=target_journal AND id=target_id AND accepted_at IS NULL;
 ELSIF action='remove' THEN DELETE FROM public.journal_members WHERE journal_id=target_journal AND user_id=target_id;
 ELSIF action='role' AND new_role IN ('viewer','editor') THEN UPDATE public.journal_members SET role=new_role WHERE journal_id=target_journal AND user_id=target_id;
 ELSE RAISE EXCEPTION 'Invalid sharing action' USING ERRCODE='22023'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.assign_entry_journal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.journals;
BEGIN
 IF NEW.journal_id IS NULL THEN
 INSERT INTO public.journals(owner_id) VALUES(NEW.user_id) ON CONFLICT(owner_id) DO NOTHING;
 SELECT * INTO j FROM public.journals WHERE owner_id=NEW.user_id;
 NEW.journal_id:=j.id;
 END IF;
 SELECT * INTO j FROM public.journals WHERE id=NEW.journal_id;
 IF j.owner_id IS DISTINCT FROM NEW.user_id OR j.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Invalid journal owner' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND (NEW.journal_id IS DISTINCT FROM OLD.journal_id OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN RAISE EXCEPTION 'Journal ownership cannot change' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN NEW.version:=1; ELSE NEW.version:=OLD.version+1; END IF;
 IF auth.uid() IS NOT NULL THEN NEW.last_edited_by:=auth.uid();
 ELSIF TG_OP='INSERT' THEN NEW.last_edited_by:=NEW.user_id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assign_entry_journal BEFORE INSERT OR UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.assign_entry_journal();
-- All shared entry writes go through the versioned RPC, including owner writes.
CREATE OR REPLACE FUNCTION public.require_versioned_journal_write() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user='authenticated' AND (NEW.visibility='friends' OR (TG_OP='UPDATE' AND OLD.visibility='friends')) THEN
 RAISE EXCEPTION 'Use the versioned journal save' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER require_versioned_journal_write BEFORE INSERT OR UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.require_versioned_journal_write();

CREATE OR REPLACE FUNCTION public.save_journal_entry(target_entry uuid,expected_version bigint,details jsonb,target_journal uuid DEFAULT NULL) RETURNS public.journal_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.journal_entries; updated public.journal_entries; j public.journals; r text; key text;
BEGIN
 IF NOT public.is_account_active() THEN RAISE EXCEPTION 'Sign in to save your entry' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(details) IS DISTINCT FROM 'object' OR octet_length(details::text)>1000000 THEN RAISE EXCEPTION 'Invalid entry' USING ERRCODE='22023'; END IF;
 SELECT * INTO e FROM public.journal_entries WHERE id=target_entry FOR UPDATE;
 IF FOUND THEN
  IF NOT public.can_edit_journal_entry(target_entry) THEN RAISE EXCEPTION 'This entry is unavailable or read only' USING ERRCODE='42501'; END IF;
 -- Retry a lost initial draft response without reapplying or overwriting its fields.
 IF expected_version IS NULL AND e.version=2 AND e.scrapbook_layout IS NULL AND e.last_edited_by=auth.uid()
 AND e.title=details->>'title' AND e.content=COALESCE(details->>'content','') THEN RETURN e; END IF;
 IF expected_version IS DISTINCT FROM e.version THEN RAISE EXCEPTION 'This entry changed. Your draft has been kept.' USING ERRCODE='40001'; END IF;
  target_journal:=e.journal_id;
 ELSE
  IF expected_version IS NOT NULL THEN RAISE EXCEPTION 'This entry is unavailable' USING ERRCODE='42501'; END IF;
  IF target_journal IS NULL THEN j:=public.ensure_my_journal(); target_journal:=j.id; END IF;
 END IF;
 SELECT * INTO j FROM public.journals WHERE id=target_journal FOR SHARE;
 r:=public.journal_role(target_journal);
 IF r IS NULL OR r='viewer' THEN RAISE EXCEPTION 'This journal is unavailable or read only' USING ERRCODE='42501'; END IF;
 FOR key IN SELECT jsonb_object_keys(details) LOOP
  IF key<>ALL(ARRAY['title','content','entry_date','tags','mood_emoji','mood_name','mood_enum','location_name','latitude','longitude','location_source','weather','scrapbook_layout','visibility','tracker_links','trip_id','trip_day_id','itinerary_item_id','memory_id','is_archived','deleted_at','status'])
  THEN RAISE EXCEPTION 'Unsupported entry field' USING ERRCODE='22023'; END IF;
  IF r='editor' AND key=ANY(ARRAY['visibility','tracker_links','trip_id','trip_day_id','itinerary_item_id','memory_id','is_archived','deleted_at'])
  THEN RAISE EXCEPTION 'Only the owner can change private links or entry access' USING ERRCODE='42501'; END IF;
  IF r='editor' AND key='status' AND (details->>'status' IS DISTINCT FROM 'published')
   AND NOT (details->>'status' IS NOT DISTINCT FROM 'draft' AND (e.id IS NULL OR (e.status='draft' AND e.last_edited_by=auth.uid())))
   THEN RAISE EXCEPTION 'Editors cannot archive or hide published entries' USING ERRCODE='42501'; END IF;
 END LOOP;
 IF e.id IS NULL THEN
  IF nullif(btrim(details->>'title'),'') IS NULL THEN RAISE EXCEPTION 'Add an entry title' USING ERRCODE='22023'; END IF;
  INSERT INTO public.journal_entries(id,user_id,journal_id,title,content,entry_date,visibility,status)
  VALUES(target_entry,j.owner_id,j.id,details->>'title',COALESCE(details->>'content',''),COALESCE((details->>'entry_date')::date,current_date),
    CASE WHEN r='editor' OR j.share_future THEN 'friends' ELSE 'private' END,COALESCE(details->>'status','published')) RETURNING * INTO e;
 END IF;
 updated:=jsonb_populate_record(e,details);
 IF nullif(btrim(updated.title),'') IS NULL OR length(updated.title)>255 OR length(updated.content)>500000 THEN RAISE EXCEPTION 'Check the entry title and length' USING ERRCODE='22023'; END IF;
 IF cardinality(updated.tags)>10 OR EXISTS(SELECT 1 FROM unnest(updated.tags) t WHERE length(t)>80) THEN RAISE EXCEPTION 'Use up to ten short tags' USING ERRCODE='22023'; END IF;
 UPDATE public.journal_entries SET title=updated.title,content=updated.content,entry_date=updated.entry_date,tags=updated.tags,
 mood_emoji=updated.mood_emoji,mood_name=updated.mood_name,mood_enum=updated.mood_enum,location_name=updated.location_name,
 latitude=updated.latitude,longitude=updated.longitude,location_source=updated.location_source,weather=updated.weather,
 scrapbook_layout=updated.scrapbook_layout,visibility=updated.visibility,tracker_links=updated.tracker_links,
 trip_id=updated.trip_id,trip_day_id=updated.trip_day_id,itinerary_item_id=updated.itinerary_item_id,memory_id=updated.memory_id,
 is_archived=updated.is_archived,deleted_at=updated.deleted_at,status=updated.status WHERE id=target_entry RETURNING * INTO e;
 RETURN e;
END $$;
CREATE OR REPLACE FUNCTION public.journal_entry_access(target_entry uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('role',public.journal_role(e.journal_id),'journal_id',e.journal_id,'version',e.version,
 'last_editor',CASE WHEN e.last_edited_by IS NULL THEN NULL ELSE COALESCE(nullif(p.full_name,''),'Journal member') END) FROM public.journal_entries e
 LEFT JOIN public.profiles p ON p.user_id=e.last_edited_by WHERE e.id=target_entry AND public.can_read_journal_entry(e.id)
$$;

CREATE OR REPLACE FUNCTION public.validate_content_links() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE record_json jsonb := to_jsonb(NEW); link record; target uuid; owner uuid; expected_owner uuid := auth.uid();
BEGIN
  IF TG_OP='UPDATE' AND (record_json->>'id' IS DISTINCT FROM to_jsonb(OLD)->>'id' OR record_json->>'user_id' IS DISTINCT FROM to_jsonb(OLD)->>'user_id') THEN RAISE EXCEPTION 'Record ownership cannot change'; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='journal_entries' AND current_user<>'authenticated' THEN expected_owner:=NEW.user_id; END IF;
  IF TG_TABLE_NAME='media' AND record_json->>'journal_entry_id' IS NOT NULL THEN
    IF NOT public.can_edit_journal_entry(NEW.journal_entry_id) OR NEW.trip_id IS NOT NULL OR NEW.memory_id IS NOT NULL
      OR NOT EXISTS(SELECT 1 FROM public.journal_entries WHERE id=NEW.journal_entry_id AND user_id=NEW.user_id)
      OR split_part(NEW.storage_path,'/',1)<>NEW.user_id::text THEN RAISE EXCEPTION 'Journal attachment access denied' USING ERRCODE='42501'; END IF;
    IF auth.uid()<>NEW.user_id AND NEW.storage_path NOT LIKE NEW.user_id::text||'/journals/'||NEW.journal_entry_id::text||'/%'
      THEN RAISE EXCEPTION 'Invalid journal attachment path' USING ERRCODE='42501'; END IF;
    RETURN NEW;
  END IF;
  FOR link IN SELECT * FROM (VALUES ('trip_id','trips'),('memory_id','memories'),('journal_entry_id','journal_entries'),('location_id','locations')) AS links(col,tbl) LOOP
    target := NULLIF(record_json->>link.col,'')::uuid;
    IF target IS NOT NULL THEN
      EXECUTE format('SELECT user_id FROM public.%I WHERE id=$1',link.tbl) INTO owner USING target;
      IF owner IS DISTINCT FROM expected_owner THEN RAISE EXCEPTION 'Linked content belongs to another account or is unavailable'; END IF;
    END IF;
  END LOOP;
  target := NULLIF(record_json->>'trip_day_id','')::uuid;
  IF target IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.trip_days WHERE id=target) THEN RAISE EXCEPTION 'Trip day is unavailable'; END IF;
  target := NULLIF(record_json->>'itinerary_item_id','')::uuid;
  IF target IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.itinerary_items WHERE id=target) THEN RAISE EXCEPTION 'Itinerary item is unavailable'; END IF;
  IF TG_TABLE_NAME='media' AND split_part(record_json->>'storage_path','/',1) IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Invalid media owner'; END IF;
  RETURN NEW;
END $$;
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
      IF (asset_owner IS DISTINCT FROM NEW.user_id AND NOT (TG_TABLE_NAME='journal_entries' AND e->>'type'='sticker' AND (asset_owner=auth.uid() OR public.journal_asset_readable(aid,'sticker')) AND public.can_edit_journal_entry(NEW.id))) OR asset_path IS NULL OR split_part(asset_path,'/',1) IS DISTINCT FROM asset_owner::text THEN
        RAISE EXCEPTION 'Decoration asset must belong to the record owner';
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.journal_asset_readable(asset uuid,kind text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.journal_entries j, jsonb_array_elements(j.scrapbook_layout->'pages') p,
 jsonb_array_elements(p->'elements') e WHERE e->>'assetId'=asset::text AND e->>'type'=kind AND public.can_read_journal_entry(j.id))
 OR (kind='sticker' AND EXISTS(SELECT 1 FROM public.journal_sticker_placements p WHERE p.sticker_asset_id=asset AND public.can_read_journal_entry(p.journal_entry_id)))
$$;
CREATE OR REPLACE FUNCTION public.journal_object_access(bucket text,object_name text,writing boolean DEFAULT false) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE entry_id uuid;
BEGIN
 IF NOT public.is_account_active() THEN RETURN false; END IF;
 IF bucket='cronevia-media' THEN
  IF NOT writing AND EXISTS(SELECT 1 FROM public.media m WHERE m.storage_path=object_name AND m.journal_entry_id IS NOT NULL AND m.trip_id IS NULL AND m.memory_id IS NULL AND public.can_read_journal_entry(m.journal_entry_id)) THEN RETURN true; END IF;
  IF writing AND object_name ~ '^[0-9a-f-]{36}/journals/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpeg|png|webp|gif)$' THEN
   entry_id:=split_part(object_name,'/',3)::uuid;
   RETURN public.can_edit_journal_entry(entry_id) AND EXISTS(SELECT 1 FROM public.journal_entries WHERE id=entry_id AND user_id::text=split_part(object_name,'/',1));
  END IF;
 ELSIF bucket='stickers-custom' AND NOT writing THEN
  RETURN EXISTS(SELECT 1 FROM public.sticker_assets s WHERE s.storage_path=object_name AND public.journal_asset_readable(s.id,'sticker'));
 END IF;
 RETURN false;
END $$;
CREATE OR REPLACE FUNCTION public.journal_object_frozen(bucket text,object_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.journal_entries j WHERE j.visibility='friends' AND
  (EXISTS(SELECT 1 FROM public.media m WHERE bucket='cronevia-media' AND m.journal_entry_id=j.id AND m.storage_path=object_name)
   OR EXISTS(SELECT 1 FROM public.sticker_assets s, jsonb_array_elements(j.scrapbook_layout->'pages') p,
    jsonb_array_elements(p->'elements') e WHERE bucket='stickers-custom' AND s.storage_path=object_name AND e->>'assetId'=s.id::text)
   OR EXISTS(SELECT 1 FROM public.sticker_assets s JOIN public.journal_sticker_placements p ON p.sticker_asset_id=s.id WHERE bucket='stickers-custom' AND s.storage_path=object_name AND p.journal_entry_id=j.id)))
$$;
CREATE POLICY journal_media_read ON public.media FOR SELECT TO authenticated USING(journal_entry_id IS NOT NULL AND trip_id IS NULL AND memory_id IS NULL AND public.can_read_journal_entry(journal_entry_id));
CREATE POLICY journal_legacy_stickers_read ON public.journal_sticker_placements FOR SELECT TO authenticated USING(public.can_read_journal_entry(journal_entry_id));
CREATE OR REPLACE FUNCTION public.guard_shared_legacy_placements() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.journal_entries WHERE id=COALESCE(NEW.journal_entry_id,OLD.journal_entry_id) AND visibility='friends') THEN
 RAISE EXCEPTION 'Use the journal editor to save shared decorations with a version' USING ERRCODE='42501'; END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER guard_shared_legacy_placements BEFORE INSERT OR UPDATE OR DELETE ON public.journal_sticker_placements FOR EACH ROW EXECUTE FUNCTION public.guard_shared_legacy_placements();
REVOKE ALL ON FUNCTION public.guard_shared_legacy_placements() FROM PUBLIC,anon,authenticated;
CREATE POLICY journal_media_delete ON public.media FOR DELETE TO authenticated USING(journal_entry_id IS NOT NULL AND public.can_edit_journal_entry(journal_entry_id));
CREATE POLICY journal_media_insert ON public.media FOR INSERT TO authenticated WITH CHECK(journal_entry_id IS NOT NULL AND public.can_edit_journal_entry(journal_entry_id)
 AND trip_id IS NULL AND memory_id IS NULL AND EXISTS(SELECT 1 FROM public.journal_entries e WHERE e.id=journal_entry_id AND e.user_id=media.user_id));
-- Old owner policies cannot be used to retarget or overwrite a shared attachment.
CREATE OR REPLACE FUNCTION public.protect_shared_asset_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF public.journal_object_frozen(CASE WHEN TG_TABLE_NAME='media' THEN 'cronevia-media' ELSE 'stickers-custom' END,OLD.storage_path)
 AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN RAISE EXCEPTION 'Shared attachments are immutable. Upload a new copy.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_shared_asset_update BEFORE UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION public.protect_shared_asset_update();
CREATE TRIGGER protect_shared_asset_update BEFORE UPDATE ON public.sticker_assets FOR EACH ROW EXECUTE FUNCTION public.protect_shared_asset_update();
CREATE POLICY journal_sticker_read ON public.sticker_assets FOR SELECT TO authenticated USING(public.journal_asset_readable(id,'sticker'));
CREATE POLICY journal_storage_read ON storage.objects FOR SELECT TO authenticated USING(public.journal_object_access(bucket_id,name));
CREATE POLICY journal_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(public.journal_object_access(bucket_id,name,true));
CREATE POLICY journal_storage_delete ON storage.objects FOR DELETE TO authenticated USING(public.journal_object_access(bucket_id,name,true));
CREATE POLICY journal_storage_immutable ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(NOT public.journal_object_frozen(bucket_id,name)) WITH CHECK(NOT public.journal_object_frozen(bucket_id,name));
CREATE POLICY journal_storage_keep_references ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(NOT public.journal_object_frozen(bucket_id,name));

CREATE OR REPLACE FUNCTION public.validate_shared_journal_layout() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e jsonb; m public.media; s public.sticker_assets;
BEGIN
 IF NEW.visibility<>'friends' THEN RETURN NEW; END IF;
 FOR e IN SELECT x.value FROM jsonb_array_elements(NEW.scrapbook_layout->'pages') p, jsonb_array_elements(p->'elements') x LOOP
  IF e->>'type'='photo' THEN
   SELECT * INTO m FROM public.media WHERE id=(e->>'assetId')::uuid;
   IF m.journal_entry_id IS DISTINCT FROM NEW.id OR m.trip_id IS NOT NULL OR m.memory_id IS NOT NULL THEN
    RAISE EXCEPTION 'Upload a journal copy of this photo before sharing; personal trip and memory photos stay private' USING ERRCODE='22023'; END IF;
  ELSIF e->>'assetId' NOT LIKE 'builtin-%' THEN
   SELECT * INTO s FROM public.sticker_assets WHERE id=(e->>'assetId')::uuid;
   IF NOT FOUND OR (s.user_id<>NEW.user_id AND s.user_id<>auth.uid() AND NOT public.journal_asset_readable(s.id,'sticker'))
    THEN RAISE EXCEPTION 'This decoration is not available to this journal' USING ERRCODE='42501'; END IF;
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_shared_journal_layout BEFORE INSERT OR UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.validate_shared_journal_layout();

REVOKE ALL ON FUNCTION public.journal_asset_readable(uuid,text),public.journal_object_access(text,text,boolean),public.journal_object_frozen(text,text),public.protect_shared_asset_update(),public.validate_shared_journal_layout() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.journal_asset_readable(uuid,text),public.journal_object_access(text,text,boolean),public.journal_object_frozen(text,text) TO authenticated;
-- Restrict callable surface; helper functions only reveal boolean access for guessed IDs.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY['journal_role','can_read_journal_entry','can_edit_journal_entry','ensure_my_journal','list_my_journals','create_journal_invite','exchange_journal_invite','journal_invite_context','accept_journal_invite','journal_sharing_details','manage_journal_sharing','save_journal_entry','journal_entry_access','assign_entry_journal','require_versioned_journal_write']) LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 IF f.signature::text !~ 'assign_entry_journal|require_versioned_journal_write' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature); END IF;
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.exchange_journal_invite(text,text),public.journal_invite_context(text) TO anon;
CREATE OR REPLACE FUNCTION public.shared_journals_schema_version() RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT '20261029.1'::text $$;
REVOKE ALL ON FUNCTION public.shared_journals_schema_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shared_journals_schema_version() TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
