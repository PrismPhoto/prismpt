
-- Enums
CREATE TYPE public.app_role AS ENUM ('manager', 'photographer');
CREATE TYPE public.event_type AS ENUM ('Casamento', 'Corporate', 'Festa', 'Baptizado', 'Outro');
CREATE TYPE public.lead_status AS ENUM ('Novo', 'Proposta Enviada', 'Adjudicado', 'Arquivo');
CREATE TYPE public.event_status AS ENUM ('Confirmado', 'Aguarda Sinal', 'Cancelado');
CREATE TYPE public.lead_source AS ENUM ('email', 'website', 'instagram', 'wedding_planner', 'outro');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_manager(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'manager') $$;

-- Photographers
CREATE TABLE public.photographers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initials TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.photographers ENABLE ROW LEVEL SECURITY;

-- Packages (versioned)
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 3,
  base_price NUMERIC(10,2) NOT NULL,
  description TEXT,
  num_prism_photographers INTEGER NOT NULL DEFAULT 1,
  has_external_photographer BOOLEAN NOT NULL DEFAULT false,
  wp_variant_percentage INTEGER, -- null = no WP variant, 10 or 15
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Wedding planners
CREATE TABLE public.wedding_planners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  commission_percentage INTEGER NOT NULL DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wedding_planners ENABLE ROW LEVEL SECURITY;

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_received DATE NOT NULL DEFAULT CURRENT_DATE,
  client_name TEXT NOT NULL,
  event_date DATE,
  email TEXT,
  pax INTEGER,
  location TEXT,
  event_type public.event_type NOT NULL DEFAULT 'Casamento',
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  source public.lead_source,
  wedding_planner_id UUID REFERENCES public.wedding_planners(id) ON DELETE SET NULL,
  notes TEXT,
  status public.lead_status NOT NULL DEFAULT 'Novo',
  event_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM event_date)::INTEGER) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lead_photographers (
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, photographer_id)
);
ALTER TABLE public.lead_photographers ENABLE ROW LEVEL SECURITY;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  client_name TEXT NOT NULL,
  email TEXT,
  pax INTEGER,
  location TEXT,
  event_type public.event_type NOT NULL DEFAULT 'Casamento',
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  package_snapshot JSONB, -- snapshot of package at adjudication
  total_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  prism_commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  wedding_planner_id UUID REFERENCES public.wedding_planners(id) ON DELETE SET NULL,
  wp_commission_value NUMERIC(10,2) DEFAULT 0,
  has_pens_caixa BOOLEAN NOT NULL DEFAULT false,
  adjudication_date DATE,
  deposit_amount NUMERIC(10,2) DEFAULT 400,
  deposit_method TEXT,
  deposit_paid_date DATE,
  final_payment_value NUMERIC(10,2),
  final_payment_date DATE,
  final_payment_method TEXT,
  internal_notes TEXT,
  event_notes TEXT,
  status public.event_status NOT NULL DEFAULT 'Aguarda Sinal',
  event_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM event_date)::INTEGER) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.event_photographers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  fee_paid BOOLEAN NOT NULL DEFAULT false,
  fee_paid_date DATE,
  UNIQUE (event_id, position)
);
ALTER TABLE public.event_photographers ENABLE ROW LEVEL SECURITY;

-- Photographer unavailability
CREATE TABLE public.photographer_unavailability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  UNIQUE (photographer_id, date)
);
ALTER TABLE public.photographer_unavailability ENABLE ROW LEVEL SECURITY;

-- Email templates
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- App settings (single row)
CREATE TABLE public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  gmail_connected BOOLEAN NOT NULL DEFAULT false,
  gcal_connected BOOLEAN NOT NULL DEFAULT false,
  gcal_calendar_id TEXT,
  draft_mode BOOLEAN NOT NULL DEFAULT true,
  followup_enabled BOOLEAN NOT NULL DEFAULT false,
  followup_days INTEGER NOT NULL DEFAULT 3,
  deposit_request_enabled BOOLEAN NOT NULL DEFAULT false,
  confirmation_enabled BOOLEAN NOT NULL DEFAULT false,
  pre_event_reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  pre_event_reminder_days INTEGER NOT NULL DEFAULT 7,
  CONSTRAINT single_row CHECK (id = 1)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_events_year ON public.events(event_year);
CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_leads_year ON public.leads(event_year);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_event_photographers_event ON public.event_photographers(event_id);
CREATE INDEX idx_event_photographers_photographer ON public.event_photographers(photographer_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== RLS POLICIES =====

-- profiles
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_manager(auth.uid()));
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_manager(auth.uid()));
CREATE POLICY "Manager manages roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

-- photographers: all authenticated can read; manager writes
CREATE POLICY "Photographers read" ON public.photographers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manager writes photographers" ON public.photographers FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

-- packages
CREATE POLICY "Packages read" ON public.packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manager writes packages" ON public.packages FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

-- wedding_planners
CREATE POLICY "WP read" ON public.wedding_planners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manager writes WP" ON public.wedding_planners FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

-- leads: manager only
CREATE POLICY "Manager all leads" ON public.leads FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "Manager all lead_photographers" ON public.lead_photographers FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

-- events: manager all; photographer sees only their assigned events
CREATE POLICY "Manager all events" ON public.events FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "Photographer reads own events" ON public.events FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.event_photographers ep
    JOIN public.photographers p ON p.id = ep.photographer_id
    WHERE ep.event_id = events.id AND p.user_id = auth.uid()
  )
);

-- event_photographers: manager all; photographer reads own rows
CREATE POLICY "Manager all event_photographers" ON public.event_photographers FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "Photographer reads own fees" ON public.event_photographers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = event_photographers.photographer_id AND p.user_id = auth.uid())
);

-- unavailability
CREATE POLICY "Manager all unavailability" ON public.photographer_unavailability FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "Photographer manages own unavailability" ON public.photographer_unavailability FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = photographer_unavailability.photographer_id AND p.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = photographer_unavailability.photographer_id AND p.user_id = auth.uid())
);
CREATE POLICY "All read unavailability" ON public.photographer_unavailability FOR SELECT TO authenticated USING (true);

-- email templates & settings
CREATE POLICY "Manager all templates" ON public.email_templates FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "Manager all settings" ON public.app_settings FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "All read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
