ALTER TABLE public.event_photographers
  ALTER COLUMN photographer_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS external_name text;

ALTER TABLE public.event_photographers
  DROP CONSTRAINT IF EXISTS event_photographers_photog_or_external;

ALTER TABLE public.event_photographers
  ADD CONSTRAINT event_photographers_photog_or_external
  CHECK (photographer_id IS NOT NULL OR (external_name IS NOT NULL AND length(btrim(external_name)) > 0));