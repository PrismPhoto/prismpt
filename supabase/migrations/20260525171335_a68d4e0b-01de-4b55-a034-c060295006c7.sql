ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS fee_distribution jsonb;

UPDATE public.packages SET fee_distribution = (
  CASE
    WHEN COALESCE(has_external_photographer, false) = false AND num_prism_photographers = 1 THEN
      '[{"mode":"percent","value":100}]'::jsonb
    WHEN COALESCE(has_external_photographer, false) = false AND num_prism_photographers = 2 THEN
      '[{"mode":"percent","value":50},{"mode":"percent","value":50}]'::jsonb
    WHEN COALESCE(has_external_photographer, false) = false AND num_prism_photographers = 3 THEN
      '[{"mode":"percent","value":33.33},{"mode":"percent","value":33.33},{"mode":"percent","value":33.34}]'::jsonb
    WHEN COALESCE(has_external_photographer, false) = true AND num_prism_photographers = 1 THEN
      '[{"mode":"percent","value":100},{"mode":"fixed","value":450}]'::jsonb
    WHEN COALESCE(has_external_photographer, false) = true AND num_prism_photographers = 2 THEN
      '[{"mode":"percent","value":50},{"mode":"percent","value":50},{"mode":"fixed","value":450}]'::jsonb
    ELSE
      '[{"mode":"percent","value":100}]'::jsonb
  END
)
WHERE fee_distribution IS NULL;