-- Fotógrafos podem consultar toda a equipa nos eventos
DROP POLICY IF EXISTS "Photographer reads own fees" ON public.event_photographers;
CREATE POLICY "Authenticated read event_photographers"
  ON public.event_photographers FOR SELECT TO authenticated USING (true);

-- Fotógrafos alocados podem editar os seus casamentos
CREATE POLICY "Assigned photographer updates event"
  ON public.events FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_photographers ep
    JOIN public.photographers p ON p.id = ep.photographer_id
    WHERE ep.event_id = events.id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.event_photographers ep
    JOIN public.photographers p ON p.id = ep.photographer_id
    WHERE ep.event_id = events.id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Assigned photographer writes event_photographers"
  ON public.event_photographers FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_photographers ep2
    JOIN public.photographers p ON p.id = ep2.photographer_id
    WHERE ep2.event_id = event_photographers.event_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.event_photographers ep2
    JOIN public.photographers p ON p.id = ep2.photographer_id
    WHERE ep2.event_id = event_photographers.event_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Assigned photographer writes event_extras"
  ON public.event_extras FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_photographers ep
    JOIN public.photographers p ON p.id = ep.photographer_id
    WHERE ep.event_id = event_extras.event_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.event_photographers ep
    JOIN public.photographers p ON p.id = ep.photographer_id
    WHERE ep.event_id = event_extras.event_id AND p.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_photographers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_extras TO authenticated;
GRANT SELECT, UPDATE ON public.events TO authenticated;