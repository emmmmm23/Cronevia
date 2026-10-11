-- Delivery is run by a scheduled Edge Function using the service role, never the browser.
ALTER TABLE public.future_letters ADD COLUMN IF NOT EXISTS delivery_started_at timestamptz;
ALTER TABLE public.future_letters ADD COLUMN IF NOT EXISTS delivery_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.future_letters ADD COLUMN IF NOT EXISTS delivery_error text;
CREATE INDEX IF NOT EXISTS future_letters_due ON public.future_letters(scheduled_for) WHERE sent_at IS NULL;
CREATE OR REPLACE FUNCTION public.protect_letter_delivery() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP='INSERT' THEN
      IF NEW.sent_at IS NOT NULL OR NEW.delivery_started_at IS NOT NULL OR NEW.delivery_attempts<>0 OR NEW.delivery_error IS NOT NULL THEN RAISE EXCEPTION 'Delivery fields are server managed'; END IF;
      IF NEW.scheduled_for<=now() THEN RAISE EXCEPTION 'Choose a future delivery date'; END IF;
    ELSE
      IF OLD.sent_at IS NOT NULL OR OLD.delivery_started_at IS NOT NULL THEN RAISE EXCEPTION 'A letter already being delivered cannot be changed'; END IF;
      IF NEW.sent_at IS DISTINCT FROM OLD.sent_at OR NEW.delivery_started_at IS DISTINCT FROM OLD.delivery_started_at OR NEW.delivery_attempts IS DISTINCT FROM OLD.delivery_attempts OR NEW.delivery_error IS DISTINCT FROM OLD.delivery_error THEN RAISE EXCEPTION 'Delivery fields are server managed'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER protect_letter_delivery BEFORE INSERT OR UPDATE ON public.future_letters FOR EACH ROW EXECUTE FUNCTION public.protect_letter_delivery();
CREATE OR REPLACE FUNCTION public.claim_due_letters() RETURNS SETOF public.future_letters
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.future_letters SET delivery_started_at=now(),delivery_attempts=delivery_attempts+1
  WHERE id IN (
    SELECT l.id FROM public.future_letters l JOIN public.profiles p ON p.user_id=l.user_id
    JOIN public.user_settings s ON s.user_id=l.user_id
    WHERE l.sent_at IS NULL AND l.scheduled_for<=now() AND l.delivery_attempts<5
      AND (l.delivery_started_at IS NULL OR l.delivery_started_at<now()-interval '10 minutes')
      AND p.account_status='active' AND COALESCE(s.email_notifications,true)
    ORDER BY l.scheduled_for LIMIT 20 FOR UPDATE OF l SKIP LOCKED
  ) RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_due_letters() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_letters() TO service_role;
GRANT ALL ON public.future_letters TO service_role;
NOTIFY pgrst,'reload schema';
