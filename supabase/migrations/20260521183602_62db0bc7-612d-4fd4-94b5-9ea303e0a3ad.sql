
-- ============ ENUMS (novos) ============
DO $$ BEGIN
  CREATE TYPE public.deposit_method AS ENUM ('revolut','bank_transfer','cyclik','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ep_role AS ENUM ('primary','secondary','tertiary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.email_template_type AS ENUM ('proposta','followup','pedido_sinal','confirmacao','lembrete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.email_draft_status AS ENUM ('draft','sent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Adiciona 'other' à lead_source se faltar
DO $$ BEGIN
  ALTER TYPE public.lead_source ADD VALUE IF NOT EXISTS 'other';
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ PROFILES ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS initials text,
  ADD COLUMN IF NOT EXISTS role public.app_role,
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- ============ PHOTOGRAPHERS ============
ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS personal_email text;

-- ============ PACKAGES ============
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS has_external boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wp_commission_10_price numeric,
  ADD COLUMN IF NOT EXISTS wp_commission_15_price numeric;

-- ============ LEADS ============
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS received_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS converted_to_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

UPDATE public.leads SET received_date = date_received WHERE received_date IS NULL;

-- ============ EVENTS ============
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS deposit_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
  ADD COLUMN IF NOT EXISTS final_value numeric,
  ADD COLUMN IF NOT EXISTS final_date date,
  ADD COLUMN IF NOT EXISTS final_method text;

UPDATE public.events SET deposit_paid = true WHERE deposit_paid_date IS NOT NULL AND deposit_paid = false;
UPDATE public.events SET final_value = final_payment_value WHERE final_value IS NULL AND final_payment_value IS NOT NULL;
UPDATE public.events SET final_date = final_payment_date WHERE final_date IS NULL AND final_payment_date IS NOT NULL;
UPDATE public.events SET final_method = final_payment_method WHERE final_method IS NULL AND final_payment_method IS NOT NULL;

-- ============ EVENT_PHOTOGRAPHERS ============
ALTER TABLE public.event_photographers
  ADD COLUMN IF NOT EXISTS role public.ep_role,
  ADD COLUMN IF NOT EXISTS fee_payment_method text;

UPDATE public.event_photographers
SET role = CASE position WHEN 1 THEN 'primary'::public.ep_role WHEN 2 THEN 'secondary'::public.ep_role ELSE 'tertiary'::public.ep_role END
WHERE role IS NULL;

-- ============ PHOTOGRAPHER_AVAILABILITY (nova) ============
CREATE TABLE IF NOT EXISTS public.photographer_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  date date NOT NULL,
  available boolean NOT NULL DEFAULT false,
  notes text,
  google_calendar_event_id text,
  UNIQUE (photographer_id, date)
);
ALTER TABLE public.photographer_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All read availability" ON public.photographer_availability
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manager all availability" ON public.photographer_availability
  FOR ALL TO authenticated
  USING (public.is_manager(auth.uid()))
  WITH CHECK (public.is_manager(auth.uid()));

CREATE POLICY "Photographer manages own availability" ON public.photographer_availability
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = photographer_availability.photographer_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = photographer_availability.photographer_id AND p.user_id = auth.uid()));

-- ============ EMAIL_DRAFTS (nova) ============
CREATE TABLE IF NOT EXISTS public.email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  template_type public.email_template_type NOT NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status public.email_draft_status NOT NULL DEFAULT 'draft',
  gmail_draft_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manager all email_drafts" ON public.email_drafts
  FOR ALL TO authenticated
  USING (public.is_manager(auth.uid()))
  WITH CHECK (public.is_manager(auth.uid()));

CREATE POLICY "Photographer read own event drafts" ON public.email_drafts
  FOR SELECT TO authenticated
  USING (
    event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.event_photographers ep
      JOIN public.photographers p ON p.id = ep.photographer_id
      WHERE ep.event_id = email_drafts.event_id AND p.user_id = auth.uid()
    )
  );

-- ============ AUTOMATION_LOG (nova) ============
CREATE TABLE IF NOT EXISTS public.automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  draft_created boolean NOT NULL DEFAULT false,
  sent boolean NOT NULL DEFAULT false,
  notes text
);
ALTER TABLE public.automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manager all automation_log" ON public.automation_log
  FOR ALL TO authenticated
  USING (public.is_manager(auth.uid()))
  WITH CHECK (public.is_manager(auth.uid()));

CREATE POLICY "Photographer read own event automation" ON public.automation_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_photographers ep
    JOIN public.photographers p ON p.id = ep.photographer_id
    WHERE ep.event_id = automation_log.event_id AND p.user_id = auth.uid()
  ));

-- ============ EMAIL_TEMPLATES ============
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS template_type public.email_template_type,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Mapeia key -> template_type quando possível
UPDATE public.email_templates SET template_type = 'proposta'::public.email_template_type WHERE template_type IS NULL AND key ILIKE '%proposta%';
UPDATE public.email_templates SET template_type = 'followup'::public.email_template_type WHERE template_type IS NULL AND key ILIKE '%follow%';
UPDATE public.email_templates SET template_type = 'pedido_sinal'::public.email_template_type WHERE template_type IS NULL AND (key ILIKE '%sinal%' OR key ILIKE '%deposit%');
UPDATE public.email_templates SET template_type = 'confirmacao'::public.email_template_type WHERE template_type IS NULL AND key ILIKE '%confirma%';
UPDATE public.email_templates SET template_type = 'lembrete'::public.email_template_type WHERE template_type IS NULL AND key ILIKE '%lembrete%';

-- ============ Índices úteis ============
CREATE INDEX IF NOT EXISTS idx_email_drafts_event ON public.email_drafts(event_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_lead ON public.email_drafts(lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_log_event ON public.automation_log(event_id);
CREATE INDEX IF NOT EXISTS idx_availability_photographer_date ON public.photographer_availability(photographer_id, date);
