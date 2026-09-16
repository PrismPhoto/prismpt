UPDATE public.packages p
SET fee_distribution = b.fee_distribution
FROM public.packages b
WHERE b.name = p.name
  AND b.version = 27
  AND b.fee_distribution IS NOT NULL
  AND p.fee_distribution IS NULL;

UPDATE public.packages p
SET has_external_photographer = agg.ext,
    has_external = agg.ext
FROM (
  SELECT name, bool_or(COALESCE(has_external_photographer, false) OR COALESCE(has_external, false)) AS ext
  FROM public.packages
  GROUP BY name
) agg
WHERE agg.name = p.name
  AND (p.has_external_photographer IS DISTINCT FROM agg.ext OR p.has_external IS DISTINCT FROM agg.ext);