-- Add prism_commission column to photographers table
ALTER TABLE public.photographers
ADD COLUMN prism_commission NUMERIC NOT NULL DEFAULT 0;

-- Set commission to 150 for specific photographers by initials
UPDATE public.photographers
SET prism_commission = 150
WHERE initials IN ('SP', 'RCD', 'JMC', 'FLC', 'LNG', 'FR');