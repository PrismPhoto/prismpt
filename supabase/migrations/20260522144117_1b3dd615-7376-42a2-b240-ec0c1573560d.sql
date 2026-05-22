ALTER TABLE public.event_photographers
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_paid_date DATE,
  ADD COLUMN IF NOT EXISTS final_payment_received BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_payment_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_payment_date DATE,
  ADD COLUMN IF NOT EXISTS final_payment_method TEXT CHECK (final_payment_method IN ('prism','fotografo'));