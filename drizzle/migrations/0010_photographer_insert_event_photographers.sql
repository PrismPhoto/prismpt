-- Fix RLS: photographer saving an event deletes all event_photographers rows first,
-- which removes their own assignment, so the subsequent INSERT failed the old
-- is_assigned_to_event check. Any authenticated photographer may now insert rows;
-- DELETE and UPDATE remain restricted to the assigned photographer or a manager.
DROP POLICY IF EXISTS "Assigned photographer insert event_photographers" ON public.event_photographers;

CREATE POLICY "Authenticated photographer insert event_photographers"
  ON public.event_photographers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_manager(auth.uid())
    OR public.has_role(auth.uid(), 'photographer')
  );