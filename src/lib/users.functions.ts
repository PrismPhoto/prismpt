import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertManager(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "manager").maybeSingle();
  if (!data) throw new Error("Apenas o Admin pode fazer isto");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertManager(context.supabase, context.userId);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("id, email, full_name, photographer_id").order("email"),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    return (profiles ?? []).map((p) => ({
      ...p,
      role: (roles ?? []).some((r) => r.user_id === p.id && r.role === "manager") ? "manager" : "photographer",
    }));
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(72),
    full_name: z.string().max(120).optional(),
    photographer_id: z.string().uuid().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { full_name: data.full_name || data.email },
    });
    if (error) throw new Error(error.message);
    const uid = created.user.id;
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "photographer" });
    if (data.photographer_id) {
      await supabaseAdmin.from("profiles").update({ photographer_id: data.photographer_id }).eq("id", uid);
      await supabaseAdmin.from("photographers").update({ user_id: uid }).eq("id", data.photographer_id);
    }
    return { id: uid };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), role: z.enum(["manager", "photographer"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    if (data.user_id === context.userId && data.role !== "manager") throw new Error("Não pode remover o seu próprio acesso de Admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const linkPhotographer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), photographer_id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("photographers").update({ user_id: null }).eq("user_id", data.user_id);
    await supabaseAdmin.from("profiles").update({ photographer_id: data.photographer_id }).eq("id", data.user_id);
    if (data.photographer_id) {
      await supabaseAdmin.from("photographers").update({ user_id: data.user_id }).eq("id", data.photographer_id);
    }
    return { ok: true };
  });
