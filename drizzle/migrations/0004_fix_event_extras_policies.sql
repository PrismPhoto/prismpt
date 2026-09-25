DROP POLICY IF EXISTS "Assigned photographer writes event_extras" ON public.event_extras;
DROP POLICY IF EXISTS "Photographer read own event extras" ON public.event_extras;
CREATE POLICY "Assigned photographer insert event_extras" ON public.event_extras FOR INSERT TO authenticated WITH CHECK (public.is_assigned_to_event(auth.uid(), event_id));
CREATE POLICY "Assigned photographer update event_extras" ON public.event_extras FOR UPDATE TO authenticated USING (public.is_assigned_to_event(auth.uid(), event_id));
CREATE POLICY "Assigned photographer delete event_extras" ON public.event_extras FOR DELETE TO authenticated USING (public.is_assigned_to_event(auth.uid(), event_id));