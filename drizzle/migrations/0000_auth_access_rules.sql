ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photographer_id uuid REFERENCES public.photographers(id) ON DELETE SET NULL;
CREATE POLICY "Authenticated read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read leads" ON public.leads FOR SELECT TO authenticated USING (true);