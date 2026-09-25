ALTER TABLE public.wedding_planners ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'percentage';
ALTER TABLE public.wedding_planners ADD COLUMN IF NOT EXISTS commission_default_value numeric;

CREATE TABLE public.photographer_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL,
  amount numeric NOT NULL DEFAULT 120,
  paid boolean NOT NULL DEFAULT false,
  paid_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, month, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photographer_contributions TO authenticated;
GRANT ALL ON public.photographer_contributions TO service_role;
ALTER TABLE public.photographer_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers manage contributions" ON public.photographer_contributions FOR ALL TO authenticated
  USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

CREATE TABLE public.prism_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly',
  category text NOT NULL DEFAULT 'other',
  start_date date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prism_expenses TO authenticated;
GRANT ALL ON public.prism_expenses TO service_role;
ALTER TABLE public.prism_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers manage expenses" ON public.prism_expenses FOR ALL TO authenticated
  USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));