-- Backend authorization and operations. No service credentials belong in the SPA.
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin' AND account_status = 'active'); $$;
CREATE OR REPLACE FUNCTION public.is_account_active() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND account_status = 'active'); $$;
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role::text FROM public.profiles WHERE user_id = auth.uid(); $$;

-- The old bootstrap function must never be callable by a browser user.
REVOKE ALL ON FUNCTION public.promote_to_super_admin(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(user_id, full_name) VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(NEW.email,'@',1), 'Traveler')) ON CONFLICT(user_id) DO NOTHING;
  INSERT INTO public.user_settings(user_id) VALUES(NEW.id) ON CONFLICT(user_id) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.protect_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Profile identity cannot change'; END IF;
  IF auth.uid() IS NOT NULL THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN RAISE EXCEPTION 'Roles can only be changed by a database administrator'; END IF;
    IF NEW.account_status IS DISTINCT FROM OLD.account_status AND (NOT public.is_super_admin() OR OLD.role = 'super_admin') THEN RAISE EXCEPTION 'Account status change forbidden'; END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS protect_profile ON public.profiles;
CREATE TRIGGER protect_profile BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile();

-- Remove previous policies for these app tables before installing a consistent policy set.
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','user_settings','trips','trip_days','itinerary_items','journal_entries','memories','media','locations','tags','people','time_capsules','time_capsule_items','future_letters','audit_logs','system_settings','feature_settings','admin_notifications','journal_entry_tag','memory_tag','trip_tag','journal_entry_person','memory_person','trip_person'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['user_settings','trips','journal_entries','memories','media','locations','tags','people','future_letters'] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT auth.uid()', t);
    EXECUTE format('CREATE POLICY owner_access ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid() AND public.is_account_active()) WITH CHECK (user_id = auth.uid() AND public.is_account_active())', t);
  END LOOP;
END; $$;

CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_super_admin());
CREATE POLICY profile_update ON public.profiles FOR UPDATE TO authenticated USING((user_id=auth.uid() AND public.is_account_active()) OR public.is_super_admin()) WITH CHECK((user_id=auth.uid() AND public.is_account_active()) OR public.is_super_admin());
REVOKE INSERT, DELETE ON public.profiles FROM authenticated;
CREATE POLICY days_owner ON public.trip_days FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.trips t WHERE t.id=trip_id AND t.user_id=auth.uid() AND t.deleted_at IS NULL)) WITH CHECK(EXISTS(SELECT 1 FROM public.trips t WHERE t.id=trip_id AND t.user_id=auth.uid() AND t.deleted_at IS NULL));
CREATE POLICY itinerary_owner ON public.itinerary_items FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.trip_days d WHERE d.id=trip_day_id)) WITH CHECK(EXISTS(SELECT 1 FROM public.trip_days d WHERE d.id=trip_day_id));
CREATE POLICY admin_audit_read ON public.audit_logs FOR SELECT TO authenticated USING(public.is_super_admin());
CREATE POLICY admin_audit_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK(public.is_super_admin() AND user_id=auth.uid());
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;
GRANT USAGE ON SEQUENCE public.audit_logs_id_seq TO authenticated;
CREATE POLICY admin_settings ON public.system_settings FOR ALL TO authenticated USING(public.is_super_admin()) WITH CHECK(public.is_super_admin());
CREATE POLICY feature_read ON public.feature_settings FOR SELECT TO authenticated USING(public.is_account_active());
CREATE POLICY feature_write ON public.feature_settings FOR ALL TO authenticated USING(public.is_super_admin()) WITH CHECK(public.is_super_admin());
CREATE POLICY admin_notifications_owner ON public.admin_notifications FOR ALL TO authenticated USING(admin_user_id=auth.uid() AND public.is_super_admin()) WITH CHECK(admin_user_id=auth.uid() AND public.is_super_admin());

-- Foreign keys prove existence, not ownership. Reject cross-account relationships.
CREATE OR REPLACE FUNCTION public.validate_content_links() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE record_json jsonb := to_jsonb(NEW); link record; target uuid; owner uuid;
BEGIN
  IF TG_OP='UPDATE' AND (record_json->>'id' IS DISTINCT FROM to_jsonb(OLD)->>'id' OR record_json->>'user_id' IS DISTINCT FROM to_jsonb(OLD)->>'user_id') THEN RAISE EXCEPTION 'Record ownership cannot change'; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  FOR link IN SELECT * FROM (VALUES ('trip_id','trips'),('memory_id','memories'),('journal_entry_id','journal_entries'),('location_id','locations')) AS links(col,tbl) LOOP
    target := NULLIF(record_json->>link.col,'')::uuid;
    IF target IS NOT NULL THEN
      EXECUTE format('SELECT user_id FROM public.%I WHERE id=$1',link.tbl) INTO owner USING target;
      IF owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Linked content belongs to another account or is unavailable'; END IF;
    END IF;
  END LOOP;
  target := NULLIF(record_json->>'trip_day_id','')::uuid;
  IF target IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.trip_days WHERE id=target) THEN RAISE EXCEPTION 'Trip day is unavailable'; END IF;
  target := NULLIF(record_json->>'itinerary_item_id','')::uuid;
  IF target IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.itinerary_items WHERE id=target) THEN RAISE EXCEPTION 'Itinerary item is unavailable'; END IF;
  IF TG_TABLE_NAME='media' AND split_part(record_json->>'storage_path','/',1) IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Invalid media owner'; END IF;
  RETURN NEW;
END; $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['trips','trip_days','itinerary_items','journal_entries','memories','media'] LOOP
    EXECUTE format('CREATE TRIGGER validate_content_links BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_content_links()',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['profiles','user_settings','trips','trip_days','itinerary_items','journal_entries','memories','media','locations','tags','people','time_capsules','time_capsule_items','future_letters','system_settings','feature_settings','admin_notifications'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I',t,t);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',t,t);
  END LOOP;
END; $$;

INSERT INTO public.system_settings(singleton) VALUES(true) ON CONFLICT(singleton) DO NOTHING;
INSERT INTO public.feature_settings(feature_key,feature_name) VALUES('journal','Journal'),('trips','Trips'),('memories','Memories'),('time_capsules','Time capsules'),('future_letters','Future letters') ON CONFLICT(feature_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_user_details(target_user_id uuid)
RETURNS TABLE(email text,last_sign_in_at timestamptz,journal_count bigint,trip_count bigint,memory_count bigint) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  RETURN QUERY SELECT u.email::text,u.last_sign_in_at,
    (SELECT count(*) FROM public.journal_entries WHERE user_id=u.id AND deleted_at IS NULL),
    (SELECT count(*) FROM public.trips WHERE user_id=u.id AND deleted_at IS NULL),
    (SELECT count(*) FROM public.memories WHERE user_id=u.id AND deleted_at IS NULL)
    FROM auth.users u WHERE u.id=target_user_id;
END; $$;
CREATE OR REPLACE FUNCTION public.get_user_statistics()
RETURNS TABLE(total_users bigint,active_users bigint,suspended_users bigint,new_users_this_month bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  RETURN QUERY SELECT count(*),count(*) FILTER(WHERE account_status='active'),count(*) FILTER(WHERE account_status='suspended'),count(*) FILTER(WHERE created_at>=date_trunc('month',now())) FROM public.profiles;
END; $$;
CREATE OR REPLACE FUNCTION public.get_content_statistics()
RETURNS TABLE(total_journal_entries bigint,total_trips bigint,total_memories bigint,total_photos bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  RETURN QUERY SELECT (SELECT count(*) FROM public.journal_entries WHERE deleted_at IS NULL),(SELECT count(*) FROM public.trips WHERE deleted_at IS NULL),(SELECT count(*) FROM public.memories WHERE deleted_at IS NULL),(SELECT count(*) FROM public.media);
END; $$;
CREATE OR REPLACE FUNCTION public.set_trip_cover(target_trip_id uuid,target_media_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
  PERFORM 1 FROM public.trips WHERE id=target_trip_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.media WHERE id=target_media_id AND trip_id=target_trip_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Trip photo not found'; END IF;
  UPDATE public.media SET is_cover=(id=target_media_id) WHERE trip_id=target_trip_id AND user_id=auth.uid();
END; $$;
CREATE OR REPLACE FUNCTION public.reorder_itinerary(target_day_id uuid,item_ids uuid[])
RETURNS void LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
  PERFORM 1 FROM public.trip_days WHERE id=target_day_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip day not found'; END IF;
  IF cardinality(item_ids)<>(SELECT count(*) FROM public.itinerary_items WHERE trip_day_id=target_day_id) OR cardinality(item_ids)<>(SELECT count(DISTINCT x) FROM unnest(item_ids) x) OR EXISTS(SELECT 1 FROM unnest(item_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.itinerary_items WHERE id=x AND trip_day_id=target_day_id)) THEN RAISE EXCEPTION 'Invalid itinerary order'; END IF;
  UPDATE public.itinerary_items i SET sort_order=s.n-1 FROM unnest(item_ids) WITH ORDINALITY s(id,n) WHERE i.id=s.id AND i.trip_day_id=target_day_id;
END; $$;

-- Time-locking is enforced in PostgreSQL, including access to the message.
REVOKE ALL ON public.time_capsules,public.time_capsule_items FROM authenticated;
CREATE OR REPLACE FUNCTION public.list_capsules() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
  IF NOT public.is_account_active() THEN RAISE EXCEPTION 'Active account required'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'unlock_date',unlock_date,'can_open',unlock_date<=current_date) ORDER BY unlock_date) FROM public.time_capsules WHERE user_id=auth.uid()),'[]'::jsonb);
END; $$;
CREATE OR REPLACE FUNCTION public.create_capsule(capsule_title text,capsule_message text,opens_on date) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE result uuid; BEGIN
  IF NOT public.is_account_active() OR length(trim(capsule_title))=0 OR opens_on<=current_date THEN RAISE EXCEPTION 'Provide a title and a future unlock date'; END IF;
  INSERT INTO public.time_capsules(user_id,title,message,unlock_date) VALUES(auth.uid(),capsule_title,capsule_message,opens_on) RETURNING id INTO result;
  RETURN result;
END; $$;
CREATE OR REPLACE FUNCTION public.open_capsule(capsule_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; BEGIN
  IF NOT public.is_account_active() THEN RAISE EXCEPTION 'Active account required'; END IF;
  UPDATE public.time_capsules SET is_unlocked=true,unlocked_at=COALESCE(unlocked_at,now()) WHERE id=capsule_id AND user_id=auth.uid() AND unlock_date<=current_date RETURNING to_jsonb(time_capsules) INTO result;
  IF result IS NULL THEN RAISE EXCEPTION 'Capsule is locked or unavailable'; END IF;
  RETURN result;
END; $$;

-- Private uploads are isolated by the authenticated user's UUID folder.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('cronevia-media','cronevia-media',false,10485760,ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=EXCLUDED.allowed_mime_types;
CREATE POLICY cronevia_media_owner ON storage.objects FOR ALL TO authenticated
USING(bucket_id='cronevia-media' AND (storage.foldername(name))[1]=auth.uid()::text AND public.is_account_active())
WITH CHECK(bucket_id='cronevia-media' AND (storage.foldername(name))[1]=auth.uid()::text AND public.is_account_active());

DO $$ DECLARE f regprocedure; BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('is_super_admin','is_account_active','get_my_role','admin_user_details','get_user_statistics','get_content_statistics','set_trip_cover','reorder_itinerary','list_capsules','create_capsule','open_capsule') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon',f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f);
  END LOOP;
END; $$;
NOTIFY pgrst,'reload schema';
