import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { EUR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({ meta: [{ title: "Fornecedores — PRISM" }, { name: "description", content: "2ºs fotógrafos e editores da PRISM." }] }),
  component: SuppliersPage,
});

type Kind = "second_photographer" | "editor";

function SuppliersPage() {
  const { role, loading } = useAuth();
  const qc = useQueryClient();
  const { data: list = [] } = useQuery({ queryKey: ["suppliers"], queryFn: async () => (await supabase.from("suppliers").select("*").order("name")).data ?? [] });
  const [editing, setEditing] = useState<any>(null);

  if (loading) return <PageContainer><p>A carregar…</p></PageContainer>;
  if (role !== "manager") return <PageContainer><p className="text-muted-foreground">Acesso reservado ao Admin.</p></PageContainer>;

  const section = (kind: Kind, title: string) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button size="sm" onClick={() => setEditing({ type: kind, active: true, name: "", email: "", phone: "", default_price: kind === "editor" ? 250 : 450, notes: "" })}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.filter((s: any) => s.type === kind).length === 0 && <p className="text-sm text-muted-foreground">Sem registos.</p>}
        {list.filter((s: any) => s.type === kind).map((s: any) => (
          <div key={s.id} className={`flex items-center justify-between border-b last:border-0 pb-2 text-sm ${s.active ? "" : "opacity-50"}`}>
            <div>
              <div className="font-medium">{s.name} {!s.active && <Badge variant="outline" className="ml-1">Inactivo</Badge>}</div>
              <div className="text-xs text-muted-foreground">{[s.email, s.phone].filter(Boolean).join(" · ") || "—"}</div>
            </div>
            <div className="flex items-center gap-3">
              <span>{s.default_price != null ? EUR(s.default_price) : "—"}</span>
              <Button size="icon" variant="ghost" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const save = async () => {
    const { id, created_at, ...rest } = editing;
    const payload = { ...rest, email: rest.email || null, phone: rest.phone || null, notes: rest.notes || null, default_price: rest.default_price === "" || rest.default_price == null ? null : Number(rest.default_price) };
    if (!payload.name?.trim()) return toast.error("Nome obrigatório");
    const { error } = id ? await supabase.from("suppliers").update(payload).eq("id", id) : await supabase.from("suppliers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["suppliers"] });
  };

  return (
    <PageContainer>
      <PageHeader title="Fornecedores" description="2ºs fotógrafos e editores" />
      <div className="grid lg:grid-cols-2 gap-4">
        {section("second_photographer", "2ºs Fotógrafos")}
        {section("editor", "Editores")}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Novo"} {editing?.type === "editor" ? "editor" : "2º fotógrafo"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              </div>
              <div><Label>Preço padrão (€)</Label><Input type="number" value={editing.default_price ?? ""} onChange={(e) => setEditing({ ...editing, default_price: e.target.value })} /></div>
              <div><Label>Notas</Label><Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={(c) => setEditing({ ...editing, active: c })} /><span className="text-sm">Activo</span></div>
              <Button onClick={save} className="w-full">Guardar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
