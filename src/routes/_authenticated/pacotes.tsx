import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { EUR } from "@/lib/format";
import { toast } from "sonner";
import { defaultDistribution, resizeDistribution, type SlotDistribution } from "@/lib/fee-distribution";

export const Route = createFileRoute("/_authenticated/pacotes")({ component: PackagesPage });

function PackagesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data: list = [] } = useQuery({ queryKey: ["pkgs-mgmt"], queryFn: async () => (await supabase.from("packages").select("*").order("version", { ascending: false }).order("base_price")).data ?? [] });

  const save = async (f: any) => {
    const payload = {
      name: f.name, version: Number(f.version), base_price: Number(f.base_price),
      description: f.description || null, num_prism_photographers: Number(f.num_prism_photographers),
      has_external_photographer: f.has_external_photographer,
      wp_variant_percentage: f.has_wp ? Number(f.wp_variant_percentage) : null,
      active: f.active,
      fee_distribution: f.fee_distribution,
    };
    const { error } = editing
      ? await supabase.from("packages").update(payload).eq("id", editing.id)
      : await supabase.from("packages").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Guardado"); setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["pkgs-mgmt"] });
  };
    const { error } = editing
      ? await supabase.from("packages").update(payload).eq("id", editing.id)
      : await supabase.from("packages").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Guardado"); setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["pkgs-mgmt"] });
  };

  return (
    <PageContainer>
      <PageHeader title="Pacotes" description="Versões antigas preservadas para histórico"
        actions={<Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Novo</Button></DialogTrigger>
          <PkgForm initial={editing} onSave={save} />
        </Dialog>} />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((p: any) => (
          <Card key={p.id} className="cursor-pointer hover:border-primary/40" onClick={() => { setEditing(p); setOpen(true); }}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="font-semibold">{p.name}</div>
                <Badge variant="outline">v{p.version}</Badge>
              </div>
              <div className="text-2xl font-bold tabular-nums">{EUR(p.base_price)}</div>
              <div className="text-xs text-muted-foreground">{p.description}</div>
              <div className="text-xs">{p.num_prism_photographers} Prism{p.has_external_photographer ? " + 1 externo" : ""}</div>
              {p.wp_variant_percentage && <Badge variant="secondary" className="text-xs">+{p.wp_variant_percentage}% WP</Badge>}
              {!p.active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}

function PkgForm({ initial, onSave }: any) {
  const [f, setF] = useState({
    name: initial?.name ?? "", version: initial?.version ?? 3, base_price: initial?.base_price ?? 0,
    description: initial?.description ?? "", num_prism_photographers: initial?.num_prism_photographers ?? 1,
    has_external_photographer: initial?.has_external_photographer ?? false,
    has_wp: !!initial?.wp_variant_percentage, wp_variant_percentage: initial?.wp_variant_percentage ?? 10,
    active: initial?.active ?? true,
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} pacote</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><Label>Versão</Label><Input type="number" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} /></div>
        <div><Label>Preço base €</Label><Input type="number" step="0.01" value={f.base_price} onChange={(e) => setF({ ...f, base_price: e.target.value })} /></div>
        <div className="col-span-2"><Label>Descrição</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div><Label>Nº Prism</Label><Input type="number" value={f.num_prism_photographers} onChange={(e) => setF({ ...f, num_prism_photographers: e.target.value })} /></div>
        <div className="flex items-center gap-2 pt-6"><Switch checked={f.has_external_photographer} onCheckedChange={(c) => setF({ ...f, has_external_photographer: c })} /><Label>+ Externo</Label></div>
        <div className="flex items-center gap-2"><Switch checked={f.has_wp} onCheckedChange={(c) => setF({ ...f, has_wp: c })} /><Label>Variante WP</Label></div>
        {f.has_wp && (
          <div><Label>% WP</Label>
            <Select value={String(f.wp_variant_percentage)} onValueChange={(v) => setF({ ...f, wp_variant_percentage: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="10">10%</SelectItem><SelectItem value="15">15%</SelectItem></SelectContent>
            </Select>
          </div>
        )}
        <div className="col-span-2 flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(c) => setF({ ...f, active: c })} /><Label>Ativo</Label></div>
      </div>
      <DialogFooter><Button onClick={() => onSave(f)}>Guardar</Button></DialogFooter>
    </DialogContent>
  );
}
