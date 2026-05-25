ALTER TABLE public.event_photographers ADD COLUMN prism_commission numeric NOT NULL DEFAULT 0;

UPDATE public.event_photographers ep
SET prism_commission = COALESCE(p.prism_commission, 0)
FROM public.photographers p
WHERE ep.photographer_id = p.id;