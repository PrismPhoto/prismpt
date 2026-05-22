import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fotografos/")({ component: PhotogPage });

function PhotogPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data: list = [] } = useQuery({ queryKey: ["photogs-mgmt"], queryFn: async () => (await supabase.from("photographers").select("*").order("initials")).data ?? [] });

  const save = async (f: any) => {
    const payload = { initials: f.initials, full_name: f.full_name, email: f.email || null, active: f.active };
    const { error } = editing
      ? await supabase.from("photographers").update(payload).eq("id", editing.id)
      : await supabase.from("photographers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["photogs-mgmt"] });
  };

  return (
    <PageContainer>
      <PageHeader title="Fotógrafos" actions={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Novo</Button></DialogTrigger>
          <PhotogForm initial={editing} onSave={save} />
        </Dialog>
      } />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((p: any) => (
          <Link
            key={p.id}
            to="/fotografos/$id"
            params={{ id: p.id }}
            className="group"
          >
            <Card className="hover:border-primary/40 transition-colors h-full">
              <CardContent className="p-4 flex items-center gap-4 h-full">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                  {p.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.email ?? "Sem email"}</div>
                </div>
                {!p.active && <span className="text-xs text-muted-foreground">Inativo</span>}
                <Button
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(p); setOpen(true); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}

function PhotogForm({ initial, onSave }: any) {
  const [f, setF] = useState({ initials: initial?.initials ?? "", full_name: initial?.full_name ?? "", email: initial?.email ?? "", active: initial?.active ?? true });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} fotógrafo</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Iniciais</Label><Input value={f.initials} onChange={(e) => setF({ ...f, initials: e.target.value.toUpperCase() })} /></div>
        <div><Label>Nome completo</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div><Label>Email pessoal</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(c) => setF({ ...f, active: c })} /><Label>Ativo</Label></div>
      </div>
      <DialogFooter><Button onClick={() => onSave(f)}>Guardar</Button></DialogFooter>
    </DialogContent>
  );
}
