CREATE TABLE public.team_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  photographer_id uuid REFERENCES public.photographers(id) ON DELETE SET NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','idea','bug')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.team_comments TO authenticated;
GRANT ALL ON public.team_comments TO service_role;
ALTER TABLE public.team_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read comments" ON public.team_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert own comments" ON public.team_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "manager delete comments" ON public.team_comments FOR DELETE TO authenticated USING (public.is_manager(auth.uid()));

CREATE TABLE public.shared_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_resources TO authenticated;
GRANT ALL ON public.shared_resources TO service_role;
ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read resources" ON public.shared_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "manager all resources" ON public.shared_resources FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

CREATE OR REPLACE FUNCTION public.team_comment_authors()
RETURNS TABLE(id uuid, full_name text, initials text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, COALESCE(p.initials, ph.initials) FROM public.profiles p
  LEFT JOIN public.photographers ph ON ph.user_id = p.id
$$;
GRANT EXECUTE ON FUNCTION public.team_comment_authors() TO authenticated;