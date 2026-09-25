ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delivery_deadline date,
  ADD COLUMN IF NOT EXISTS delivery_date date,
  ADD COLUMN IF NOT EXISTS gallery_link text;
ALTER TABLE public.events ADD CONSTRAINT events_delivery_status_chk CHECK (delivery_status IN ('pending','editing','delivered'));

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS delivery_deadline_days integer NOT NULL DEFAULT 60;

UPDATE public.events SET delivery_deadline = event_date + 60 WHERE event_date IS NOT NULL AND delivery_deadline IS NULL;

CREATE OR REPLACE FUNCTION public.set_delivery_deadline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d integer;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.event_date IS DISTINCT FROM OLD.event_date THEN
    SELECT COALESCE(delivery_deadline_days, 60) INTO d FROM public.app_settings WHERE id = 1;
    NEW.delivery_deadline := CASE WHEN NEW.event_date IS NULL THEN NULL ELSE NEW.event_date + COALESCE(d, 60) END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_events_delivery_deadline BEFORE INSERT OR UPDATE OF event_date ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_delivery_deadline();

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON public.audit_log (created_at DESC);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o jsonb; n jsonb; rid text;
BEGIN
  IF TG_OP <> 'INSERT' THEN o := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN n := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' AND o - 'updated_at' = n - 'updated_at' THEN RETURN NEW; END IF;
  rid := COALESCE(n->>'id', o->>'id');
  INSERT INTO public.audit_log (user_id, user_email, action, table_name, record_id, old_values, new_values)
  VALUES (auth.uid(), COALESCE(auth.jwt()->>'email', (SELECT email FROM auth.users WHERE id = auth.uid())), TG_OP, TG_TABLE_NAME, rid, o, n);
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_audit_events AFTER INSERT OR UPDATE OR DELETE ON public.events FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER trg_audit_event_photographers AFTER INSERT OR UPDATE OR DELETE ON public.event_photographers FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER trg_audit_event_extras AFTER INSERT OR UPDATE OR DELETE ON public.event_extras FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER trg_audit_leads AFTER INSERT OR UPDATE OR DELETE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER trg_audit_photographers AFTER INSERT OR UPDATE OR DELETE ON public.photographers FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();