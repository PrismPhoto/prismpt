import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "manager" | "photographer";

export interface AuthState {
  user: User | null;
  loading: boolean;
  role: AppRole | null;
  photographerId: string | null;
  initials: string | null;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [photographerId, setPhotographerId] = useState<string | null>(null);
  const [initials, setInitials] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setPhotographerId(null);
      setInitials(null);
      return;
    }
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (roles?.some((r) => r.role === "manager")) setRole("manager");
      else if (roles?.some((r) => r.role === "photographer")) setRole("photographer");
      else setRole(null);

      const { data: photog } = await supabase
        .from("photographers")
        .select("id, initials")
        .eq("user_id", user.id)
        .maybeSingle();
      setPhotographerId(photog?.id ?? null);
      setInitials(photog?.initials ?? null);
    })();
  }, [user]);

  return { user, loading, role, photographerId, initials };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
