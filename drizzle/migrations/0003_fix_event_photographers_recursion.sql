CREATE OR REPLACE FUNCTION public.is_assigned_to_event(_user_id uuid, _event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_photographers ep JOIN public.photographers p ON p.id = ep.photographer_id
    WHERE ep.event_id = _event_id AND p.user_id = _user_id)
$$;

DROP POLICY IF EXISTS "Assigned photographer writes event_photographers" ON public.event_photographers;
CREATE POLICY "Assigned photographer insert event_photographers" ON public.event_photographers FOR INSERT TO authenticated WITH CHECK (public.is_assigned_to_event(auth.uid(), event_id));
CREATE POLICY "Assigned photographer update event_photographers" ON public.event_photographers FOR UPDATE TO authenticated USING (public.is_assigned_to_event(auth.uid(), event_id)) WITH CHECK (public.is_assigned_to_event(auth.uid(), event_id));
CREATE POLICY "Assigned photographer delete event_photographers" ON public.event_photographers FOR DELETE TO authenticated USING (public.is_assigned_to_event(auth.uid(), event_id));

DROP POLICY IF EXISTS "Assigned photographer updates event" ON public.events;
CREATE POLICY "Assigned photographer updates event" ON public.events FOR UPDATE TO authenticated USING (public.is_assigned_to_event(auth.uid(), id));
DROP POLICY IF EXISTS "Photographer reads own events" ON public.events;