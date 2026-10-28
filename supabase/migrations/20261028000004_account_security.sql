-- Account security: opt-in MFA enforcement and an atomic quota for paid place lookups.
-- Preserves account/content rows and existing ownership policies.
BEGIN;
CREATE OR REPLACE FUNCTION public.is_mfa_satisfied() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (
   COALESCE(auth.jwt()->>'aal','')='aal2' OR NOT EXISTS (
     SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.uid() AND status='verified'
   )
 );
$$;
REVOKE ALL ON FUNCTION public.is_mfa_satisfied() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_mfa_satisfied() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_account_active() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.is_mfa_satisfied() AND EXISTS(
   SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND account_status='active'
 );
$$;
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.is_mfa_satisfied() AND EXISTS(
   SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='super_admin' AND account_status='active'
 );
$$;
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT role::text FROM public.profiles WHERE user_id=auth.uid() AND public.is_account_active();
$$;

-- Restrictive policies combine with (and never replace) the existing owner policies.
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename=ANY(ARRAY[
 'profiles','user_settings','trips','trip_days','itinerary_items','journal_entries','memories','media',
 'locations','tags','people','time_capsules','time_capsule_items','future_letters','audit_logs','system_settings',
 'feature_settings','admin_notifications','journal_entry_tag','memory_tag','trip_tag','journal_entry_person',
 'memory_person','trip_person','sticker_assets','journal_sticker_placements','creative_trackers','tracker_logs','tracker_boards']) LOOP
  EXECUTE format('DROP POLICY IF EXISTS account_mfa_required ON public.%I',t);
  EXECUTE format('CREATE POLICY account_mfa_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.is_mfa_satisfied())) WITH CHECK ((SELECT public.is_mfa_satisfied()))',t);
 END LOOP;
END $$;
DROP POLICY IF EXISTS account_mfa_required ON storage.objects;
CREATE POLICY account_mfa_required ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
 USING(bucket_id NOT IN ('cronevia-media','stickers-custom') OR (SELECT public.is_mfa_satisfied()))
 WITH CHECK(bucket_id NOT IN ('cronevia-media','stickers-custom') OR (SELECT public.is_mfa_satisfied()));

CREATE SCHEMA IF NOT EXISTS cronevia_private;
REVOKE ALL ON SCHEMA cronevia_private FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS cronevia_private.place_quotas(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL, last_request timestamptz NOT NULL, used integer NOT NULL CHECK(used>0)
);
ALTER TABLE cronevia_private.place_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cronevia_private.place_quotas FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.consume_place_request() RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE stamp timestamptz:=clock_timestamp(); admitted uuid;
BEGIN
 IF NOT public.is_account_active() THEN RAISE EXCEPTION 'Account verification required' USING ERRCODE='42501'; END IF;
 INSERT INTO cronevia_private.place_quotas(user_id,window_start,last_request,used)
 VALUES(auth.uid(),stamp,stamp,1)
 ON CONFLICT(user_id) DO UPDATE SET
  window_start=CASE WHEN place_quotas.window_start<=stamp-interval '1 minute' THEN stamp ELSE place_quotas.window_start END,
  last_request=stamp,
  used=CASE WHEN place_quotas.window_start<=stamp-interval '1 minute' THEN 1 ELSE place_quotas.used+1 END
 WHERE place_quotas.last_request<=stamp-interval '1 second'
  AND (place_quotas.window_start<=stamp-interval '1 minute' OR place_quotas.used<30)
 RETURNING user_id INTO admitted;
 RETURN admitted IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.consume_place_request() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.consume_place_request() TO authenticated;

CREATE OR REPLACE FUNCTION public.security_schema_version() RETURNS text
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT '20261028.4'::text $$;
REVOKE ALL ON FUNCTION public.security_schema_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.security_schema_version() TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
