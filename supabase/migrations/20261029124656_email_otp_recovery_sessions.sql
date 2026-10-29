-- Supabase implicit /verify issues recovery sessions with the OTP method.
-- Only the caller's own verified session can be marked; this narrows access.
BEGIN;
CREATE TABLE IF NOT EXISTS cronevia_private.password_recovery_sessions (
 session_id uuid PRIMARY KEY REFERENCES auth.sessions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_recovery_sessions_user_idx ON cronevia_private.password_recovery_sessions(user_id);
ALTER TABLE cronevia_private.password_recovery_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cronevia_private.password_recovery_sessions FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.restrict_password_recovery_session() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid text:=auth.jwt()->>'session_id'; admitted uuid;
BEGIN
 IF auth.uid() IS NULL OR sid IS NULL OR sid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 THEN RETURN false; END IF;
 IF NOT (COALESCE(auth.jwt()->'amr','[]'::jsonb) @> '[{"method":"otp"}]'::jsonb
 OR COALESCE(auth.jwt()->'amr','[]'::jsonb) @> '[{"method":"recovery"}]'::jsonb
 OR COALESCE(auth.jwt()->'amr','[]'::jsonb) @> '["otp"]'::jsonb
 OR COALESCE(auth.jwt()->'amr','[]'::jsonb) @> '["recovery"]'::jsonb) THEN RETURN false; END IF;
 INSERT INTO cronevia_private.password_recovery_sessions(session_id,user_id)
 SELECT s.id,s.user_id FROM auth.sessions s WHERE s.id=sid::uuid AND s.user_id=auth.uid()
 ON CONFLICT(session_id) DO UPDATE SET user_id=EXCLUDED.user_id
 RETURNING session_id INTO admitted;
 RETURN admitted IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.restrict_password_recovery_session() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.restrict_password_recovery_session() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_mfa_satisfied() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL
 AND NOT (COALESCE(auth.jwt()->'amr','[]'::jsonb) @> '[{"method":"recovery"}]'::jsonb
 OR COALESCE(auth.jwt()->'amr','[]'::jsonb) @> '["recovery"]'::jsonb)
 -- OTP access tokens remain denied after logout removes the session and its
 -- restriction record; deleting the marker must never restore JWT access.
 AND (NOT (COALESCE(auth.jwt()->'amr','[]'::jsonb) @> '[{"method":"otp"}]'::jsonb
 OR COALESCE(auth.jwt()->'amr','[]'::jsonb) @> '["otp"]'::jsonb)
 OR EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=nullif(auth.jwt()->>'session_id','')::uuid AND s.user_id=auth.uid()))
 AND NOT EXISTS(SELECT 1 FROM cronevia_private.password_recovery_sessions r
 WHERE r.session_id::text=auth.jwt()->>'session_id' AND r.user_id=auth.uid())
 AND (COALESCE(auth.jwt()->>'aal','')='aal2' OR NOT EXISTS (
 SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.uid() AND status='verified'));
$$;
REVOKE ALL ON FUNCTION public.is_mfa_satisfied() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_mfa_satisfied() TO authenticated;
CREATE OR REPLACE FUNCTION public.password_recovery_schema_version() RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT '20261029.3'::text $$;
REVOKE ALL ON FUNCTION public.password_recovery_schema_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.password_recovery_schema_version() TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
