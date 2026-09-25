CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  type text NOT NULL CHECK (type IN ('second_photographer','editor')),
  default_price numeric,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manager manages suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

ALTER TABLE public.events ADD COLUMN second_photographer_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN second_photographer_cost numeric;
ALTER TABLE public.events ADD COLUMN editor_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN editor_cost numeric;
ALTER TABLE public.events ALTER COLUMN second_photographer_cost SET DEFAULT 450;
ALTER TABLE public.events ALTER COLUMN editor_cost SET DEFAULT 250;

ALTER TABLE public.app_settings ADD COLUMN default_second_photographer_cost numeric NOT NULL DEFAULT 450;
ALTER TABLE public.app_settings ADD COLUMN default_editor_cost numeric NOT NULL DEFAULT 250;