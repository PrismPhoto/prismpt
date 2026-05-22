import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_TYPES, LEAD_STATUSES, LEAD_SOURCES, fmtDate } from "@/lib/format";
import { Plus, Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leads")({ component: LeadsPage });

const STATUS_COLS = ["Novo", "Proposta Enviada", "Adjudicado", "Arquivo"] as const;

function LeadsPage() {
  const qc = useQueryClient();
  const [year, setYear] = useState(2027);
  const [typeFilter, setTypeFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: leads = [] } = useQuery({
    queryKey: ["leads", year, typeFilter],
    queryFn: async () => {
      let q = supabase.from("leads").select("*, packages(name), wedding_planners(name)").order("event_date", { ascending: true });
      const { data } = await q;
      return (data ?? []).filter((l) =>
        (!l.event_year || l.event_year === year) &&
        (typeFilter === "all" || l.event_type === typeFilter)
      );
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => (await supabase.from("packages").select("*").eq("active", true)).data ?? [],
  });
  const { data: wps = [] } = useQuery({
    queryKey: ["wps"],
    queryFn: async () => (await supabase.from("wedding_planners").select("*")).data ?? [],
  });

  const adjudicate = useMutation({
    mutationFn: async (lead: any) => {
      if (lead.converted_to_event_id) {
        await supabase.from("leads").update({ status: "Adjudicado" as any }).eq("id", lead.id);
        return;
      }
      if (!lead.event_date) throw new Error("Lead sem data de evento — defina a data antes de adjudicar.");
      const pkg = packages.find((p: any) => p.id === lead.package_id);
      const { data: ev, error } = await supabase.from("events").insert({
        lead_id: lead.id,
        event_date: lead.event_date,
        client_name: lead.client_name,
        email: lead.email,
        pax: lead.pax,
        location: lead.location,
        event_type: lead.event_type,
        package_id: lead.package_id,
        package_snapshot: pkg ? { name: pkg.name, version: pkg.version, base_price: pkg.base_price } : null,
        total_value: pkg?.base_price ?? 0,
        wedding_planner_id: lead.wedding_planner_id,
        adjudication_date: new Date().toISOString().slice(0, 10),
        status: "Aguarda Sinal",
      }).select().single();
      if (error) throw error;
      await supabase.from("leads").update({ status: "Adjudicado" as any, converted_to_event_id: ev.id }).eq("id", lead.id);
    },
    onSuccess: () => {
      toast.success("Lead adjudicada — evento criado");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ lead, status }: { lead: any; status: string }) => {
      if (status === "Adjudicado" && !lead.converted_to_event_id) {
        await adjudicate.mutateAsync(lead);
        return;
      }
      const { error } = await supabase.from("leads").update({ status: status as any }).eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <PageContainer>
      <PageHeader
        title="Leads"
        description="Pipeline comercial"
        actions={
          <>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Nova lead</Button>
              </DialogTrigger>
              <LeadForm
                key={editing?.id ?? "new"}
                lead={editing}
                packages={packages}
                wps={wps}
                onSaved={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["leads"] }); }}
              />
            </Dialog>
          </>
        }
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATUS_COLS.map((col) => (
          <div key={col} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{col}</h3>
              <Badge variant="secondary">{leads.filter((l) => l.status === col).length}</Badge>
            </div>
            <div className="space-y-2">
              {leads.filter((l) => l.status === col).map((l) => (
                <Card key={l.id} className="cursor-pointer hover:border-primary/40" onClick={() => { setEditing(l); setOpen(true); }}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm">{l.client_name}</div>
                      <Badge variant="outline" className="text-xs">{l.event_type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{fmtDate(l.event_date)} · {l.pax ?? "?"} pax</div>
                    {l.packages && <div className="text-xs">{l.packages.name}</div>}
                    {l.wedding_planners && <div className="text-xs text-muted-foreground">WP: {l.wedding_planners.name}</div>}
                    <div className="flex gap-1 flex-wrap pt-1" onClick={(e) => e.stopPropagation()}>
                      <Select value={l.status} onValueChange={(v) => updateStatus.mutate({ lead: l, status: v })}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      {l.status !== "Adjudicado" && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => adjudicate.mutate(l)} title="Adjudicar">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Preparar email">
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}

function LeadForm({ lead, packages, wps, onSaved }: any) {
  const isEdit = !!lead;
  const [form, setForm] = useState({
    client_name: lead?.client_name ?? "",
    email: lead?.email ?? "",
    event_date: lead?.event_date ?? "",
    pax: lead?.pax ?? "",
    location: lead?.location ?? "",
    event_type: lead?.event_type ?? "Casamento",
    package_id: lead?.package_id ?? "",
    source: lead?.source ?? "email",
    wedding_planner_id: lead?.wedding_planner_id ?? "",
    notes: lead?.notes ?? "",
    status: lead?.status ?? "Novo",
  });

  const save = async () => {
    const payload: any = {
      ...form,
      pax: form.pax ? Number(form.pax) : null,
      package_id: form.package_id || null,
      wedding_planner_id: form.wedding_planner_id || null,
      event_date: form.event_date || null,
    };
    const { error } = isEdit
      ? await supabase.from("leads").update(payload).eq("id", lead.id)
      : await supabase.from("leads").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Lead guardada");
    onSaved();
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{isEdit ? "Editar lead" : "Nova lead"}</DialogTitle></DialogHeader>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Cliente"><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Data evento"><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></Field>
        <Field label="Pax"><Input type="number" value={form.pax} onChange={(e) => setForm({ ...form, pax: e.target.value })} /></Field>
        <Field label="Local" className="md:col-span-2"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
        <Field label="Tipo">
          <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Pacote">
          <Select value={form.package_id} onValueChange={(v) => setForm({ ...form, package_id: v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.base_price}€)</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Fonte">
          <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Wedding planner">
          <Select value={form.wedding_planner_id || "none"} onValueChange={(v) => setForm({ ...form, wedding_planner_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {wps.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Notas" className="md:col-span-2"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </div>
      <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children, className = "" }: any) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
