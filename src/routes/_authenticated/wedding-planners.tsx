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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wedding-planners")({ component: WpPage });

function WpPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data: list = [] } = useQuery({ queryKey: ["wps-mgmt"], queryFn: async () => {
    const { data: wps } = await supabase.from("wedding_planners").select("*").order("name");
    const { data: events } = await supabase.from("events").select("wedding_planner_id, wp_commission_value");
    return (wps ?? []).map((w) => {
      const evs = (events ?? []).filter((e) => e.wedding_planner_id === w.id);
      return { ...w, count: evs.length, totalCommissions: evs.reduce((s, e) => s + Number(e.wp_commission_value || 0), 0) };
    });
  } });

  const save = async (f: any) => {
    const payload = {
      name: f.name, email: f.email || null, commission_percentage: Number(f.commission_percentage), notes: f.notes || null,
      commission_type: f.commission_type,
      commission_default_value: f.commission_default_value === "" || f.commission_default_value == null ? null : Number(f.commission_default_value),
    };
    const { error } = editing
      ? await supabase.from("wedding_planners").update(payload).eq("id", editing.id)
      : await supabase.from("wedding_planners").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Guardado"); setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["wps-mgmt"] });
  };

  return (
    <PageContainer>
      <PageHeader title="Wedding Planners" actions={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Nova</Button></DialogTrigger>
          <WpForm initial={editing} onSave={save} />
        </Dialog>
      } />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((w: any) => (
          <Card key={w.id} className="cursor-pointer hover:border-primary/40" onClick={() => { setEditing(w); setOpen(true); }}>
            <CardContent className="p-4 space-y-1">
              <div className="font-semibold">{w.name}</div>
              <div className="text-xs text-muted-foreground">{w.email ?? "—"}</div>
              <div className="text-xs">Comissão: {w.commission_type === "fixed" ? `${Number(w.commission_default_value || 0).toFixed(2)}€ fixo` : `${w.commission_percentage}%`}</div>
              <div className="text-xs text-muted-foreground pt-2 border-t mt-2">{w.count} eventos · {w.totalCommissions.toFixed(2)}€ comissões</div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Sem wedding planners.</p>}
      </div>
    </PageContainer>
  );
}

function WpForm({ initial, onSave }: any) {
  const [f, setF] = useState<any>({
    name: initial?.name ?? "", email: initial?.email ?? "",
    commission_percentage: initial?.commission_percentage ?? 10, notes: initial?.notes ?? "",
    commission_type: initial?.commission_type ?? "percentage",
    commission_default_value: initial?.commission_default_value ?? "",
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar" : "Nova"} wedding planner</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><Label>Tipo de comissão</Label>
          <Select value={f.commission_type} onValueChange={(v) => setF({ ...f, commission_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="percentage">Percentagem</SelectItem><SelectItem value="fixed">Valor fixo</SelectItem></SelectContent>
          </Select>
        </div>
        {f.commission_type === "percentage" ? (
          <div><Label>Comissão (%)</Label>
            <Select value={String(f.commission_percentage)} onValueChange={(v) => setF({ ...f, commission_percentage: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="10">10%</SelectItem><SelectItem value="15">15%</SelectItem></SelectContent>
            </Select>
          </div>
        ) : (
          <div><Label>Valor fixo padrão (€)</Label><Input type="number" step="0.01" value={f.commission_default_value} onChange={(e) => setF({ ...f, commission_default_value: e.target.value })} /></div>
        )}
        <div><Label>Notas</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={() => onSave(f)}>Guardar</Button></DialogFooter>
    </DialogContent>
  );
}
