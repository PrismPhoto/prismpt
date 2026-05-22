
DO $$ BEGIN
  CREATE TYPE public.extra_type AS ENUM (
    'Deslocação','Estadia','Hora Extra','Pack Analógico Foto','Pack Analógico Video Super8',
    'Sessão de Noivos','Pre-Wedding','Álbum Grande','Álbum Médio','Álbum Pequeno','Álbum Best Of','WoodBox','Outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.event_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  extra_type public.extra_type NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  photographer_id uuid REFERENCES public.photographers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manager all event_extras" ON public.event_extras;
CREATE POLICY "Manager all event_extras" ON public.event_extras
  FOR ALL TO authenticated USING (is_manager(auth.uid())) WITH CHECK (is_manager(auth.uid()));

DROP POLICY IF EXISTS "Photographer read own event extras" ON public.event_extras;
CREATE POLICY "Photographer read own event extras" ON public.event_extras
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM event_photographers ep
      JOIN photographers p ON p.id = ep.photographer_id
      WHERE ep.event_id = event_extras.event_id AND p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_event_extras_event ON public.event_extras(event_id);

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS brand_voice text;
