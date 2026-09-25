CREATE POLICY "Authenticated read event_extras"
  ON public.event_extras FOR SELECT TO authenticated USING (true);