import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listUsers, inviteUser, setUserRole, linkPhotographer } from "@/lib/users.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

export function UsersAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const invite = useServerFn(inviteUser);
  const setRole = useServerFn(setUserRole);
  const link = useServerFn(linkPhotographer);
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });
  const { data: photogs = [] } = useQuery({
    queryKey: ["photographers-link"],
    queryFn: async () => (await supabase.from("photographers").select("id, initials, full_name, email, user_id").order("full_name")).data ?? [],
  });
  const [f, setF] = useState({ email: "", password: "", full_name: "", photographer_id: "none" });
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["photographers-link"] }); };

  const doInvite = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await invite({ data: { ...f, photographer_id: f.photographer_id === "none" ? null : f.photographer_id } });
      toast.success(`Conta criada para ${f.email}`);
      setF({ email: "", password: "", full_name: "", photographer_id: "none" }); refresh();
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };

  const run = async (p: Promise<any>) => { try { await p; refresh(); toast.success("Actualizado"); } catch (e: any) { toast.error(e.message); } };
  const userEmail = (id: string | null) => users.find((u: any) => u.id === id)?.email;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Convidar fotógrafo</CardTitle>
          <CardDescription>Cria a conta com uma password temporária — envie-a ao fotógrafo.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={doInvite} className="grid gap-3 md:grid-cols-5 items-end">
            <div className="space-y-1"><Label>Nome</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Password temporária</Label><Input required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
            <div className="space-y-1"><Label>Fotógrafo</Label>
              <Select value={f.photographer_id} onValueChange={(v) => setF({ ...f, photographer_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>
                  {photogs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.initials} · {p.full_name}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <Button type="submit" disabled={busy}>{busy ? "A criar…" : "Criar conta"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Utilizadores</CardTitle><CardDescription>Admin tem acesso total; Fotógrafo só consulta.</CardDescription></CardHeader>
        <CardContent className="divide-y">
          {users.map((u: any) => (
            <div key={u.id} className="py-3 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]"><div className="font-medium">{u.full_name || u.email}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
              <Select value={u.photographer_id ?? "none"} onValueChange={(v) => run(link({ data: { user_id: u.id, photographer_id: v === "none" ? null : v } }))}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Ligar a fotógrafo" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Sem fotógrafo</SelectItem>
                  {photogs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.initials} · {p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={u.role === "manager"} onCheckedChange={(c) => run(setRole({ data: { user_id: u.id, role: c ? "manager" : "photographer" } }))} />
                {u.role === "manager" ? "Admin" : "Fotógrafo"}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fotógrafos</CardTitle></CardHeader>
        <CardContent className="divide-y text-sm">
          {photogs.map((p: any) => (
            <div key={p.id} className="py-2 flex justify-between gap-4">
              <span>{p.initials} · {p.full_name}</span>
              <span className="text-muted-foreground">{userEmail(p.user_id) ?? "Sem conta ligada"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
