-- A recovery session can change its password through Auth, but cannot use app data.
BEGIN;
CREATE OR REPLACE FUNCTION public.is_mfa_satisfied() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL
 AND NOT COALESCE(auth.jwt()->'amr','[]'::jsonb) @> '[{"method":"recovery"}]'::jsonb
 AND (
   COALESCE(auth.jwt()->>'aal','')='aal2' OR NOT EXISTS (
     SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.uid() AND status='verified'
   )
 );
$$;
REVOKE ALL ON FUNCTION public.is_mfa_satisfied() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_mfa_satisfied() TO authenticated;
CREATE OR REPLACE FUNCTION public.password_recovery_schema_version() RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT '20261029.2'::text $$;
REVOKE ALL ON FUNCTION public.password_recovery_schema_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.password_recovery_schema_version() TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
