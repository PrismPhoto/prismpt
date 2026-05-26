
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS couple_names text,
  ADD COLUMN IF NOT EXISTS bride_prep_address text,
  ADD COLUMN IF NOT EXISTS groom_prep_address text,
  ADD COLUMN IF NOT EXISTS bride_phone text,
  ADD COLUMN IF NOT EXISTS groom_phone text,
  ADD COLUMN IF NOT EXISTS ceremony_location text,
  ADD COLUMN IF NOT EXISTS ceremony_time time,
  ADD COLUMN IF NOT EXISTS reception_location text,
  ADD COLUMN IF NOT EXISTS instagram_tags text,
  ADD COLUMN IF NOT EXISTS decoration_company text,
  ADD COLUMN IF NOT EXISTS catering_company text,
  ADD COLUMN IF NOT EXISTS videographer text,
  ADD COLUMN IF NOT EXISTS bride_dress text,
  ADD COLUMN IF NOT EXISTS makeup_hair text,
  ADD COLUMN IF NOT EXISTS pre_wedding_notes text,
  ADD COLUMN IF NOT EXISTS photo_permission text;
