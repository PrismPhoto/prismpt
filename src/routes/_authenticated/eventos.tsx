import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_STATUSES, EVENT_TYPES, EUR, fmtDate } from "@/lib/format";
import { EXTRA_TYPES, EXTRA_DEFAULT_PRICE, type ExtraType } from "@/lib/extras";
import { Plus, Download, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/eventos")({ component: EventsPage });

function EventsPage() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const [year, setYear] = useState(2027);
  const [typeF, setTypeF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["events", year, typeF, statusF],
    queryFn: async () => {
      let q = supabase.from("events").select("*, packages(name), wedding_planners(name), event_photographers(*, photographers(initials, full_name))").eq("event_year", year).order("event_date");
      if (typeF !== "all") q = q.eq("event_type", typeF as any);
      if (statusF !== "all") q = q.eq("status", statusF as any);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: packages = [] } = useQuery({ queryKey: ["packages-all"], queryFn: async () => (await supabase.from("packages").select("*")).data ?? [] });
  const { data: wps = [] } = useQuery({ queryKey: ["wps"], queryFn: async () => (await supabase.from("wedding_planners").select("*")).data ?? [] });
  const { data: photographers = [] } = useQuery({ queryKey: ["photogs"], queryFn: async () => (await supabase.from("photographers").select("*").eq("active", true)).data ?? [] });

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

  const exportCsv = () => {
    const rows = [
      ["Data", "Cliente", "Tipo", "Pacote", "Valor", "WP", "Comissão WP", "Status"],
      ...events.map((e: any) => [
        e.event_date, e.client_name, e.event_type, e.packages?.name ?? "", e.total_value,
        e.wedding_planners?.name ?? "", e.wp_commission_value ?? 0, e.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `eventos-${year}.csv`; a.click();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Eventos"
        actions={
          <>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={typeF} onValueChange={setTypeF}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos status</SelectItem>{EVENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
            {role === "manager" && (
              <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
                <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Novo evento</Button></DialogTrigger>
                <EventForm key={editing?.id ?? "new"} event={editing} packages={packages} wps={wps} photographers={photographers}
                  onSaved={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["events"] }); }} />
              </Dialog>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Pacote</th>
                  <th className="text-left p-3">Fotógrafos</th>
                  <th className="text-right p-3">Valor</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e: any) => (
                  <tr key={e.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => { if (role === "manager") { setEditing(e); setOpen(true); } }}>
                    <td className="p-3 whitespace-nowrap">{fmtDate(e.event_date)}</td>
                    <td className="p-3 font-medium">{e.client_name}</td>
                    <td className="p-3"><Badge variant="outline">{e.event_type}</Badge></td>
                    <td className="p-3 text-muted-foreground">{e.packages?.name ?? "—"}</td>
                    <td className="p-3 text-xs">{e.event_photographers?.map((ep: any) => ep.photographers?.initials).join(" · ")}</td>
                    <td className="p-3 text-right tabular-nums">{EUR(e.total_value)}</td>
                    <td className="p-3"><Badge variant={e.status === "Confirmado" ? "default" : e.status === "Cancelado" ? "destructive" : "secondary"}>{e.status}</Badge></td>
                  </tr>
                ))}
                {events.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sem eventos</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function EventForm({ event, packages, wps, photographers, onSaved }: any) {
  const isEdit = !!event;
  const [form, setForm] = useState<any>(() => {
    const existingPhotogs = event?.event_photographers ?? [];
    return {
      event_date: event?.event_date ?? "",
      client_name: event?.client_name ?? "",
      email: event?.email ?? "",
      pax: event?.pax ?? "",
      location: event?.location ?? "",
      event_type: event?.event_type ?? "Casamento",
      package_id: event?.package_id ?? "",
      total_value: event?.total_value ?? 0,
      prism_commission: event?.prism_commission ?? 0,
      wedding_planner_id: event?.wedding_planner_id ?? "",
      wp_commission_value: event?.wp_commission_value ?? 0,
      has_pens_caixa: event?.has_pens_caixa ?? false,
      adjudication_date: event?.adjudication_date ?? "",
      deposit_amount: event?.deposit_amount ?? 400,
      deposit_method: event?.deposit_method ?? "",
      deposit_paid_date: event?.deposit_paid_date ?? "",
      final_payment_value: event?.final_payment_value ?? "",
      final_payment_date: event?.final_payment_date ?? "",
      final_payment_method: event?.final_payment_method ?? "",
      internal_notes: event?.internal_notes ?? "",
      event_notes: event?.event_notes ?? "",
      status: event?.status ?? "Aguarda Sinal",
      photog1: existingPhotogs.find((p: any) => p.position === 1)?.photographer_id ?? "",
      fee1: existingPhotogs.find((p: any) => p.position === 1)?.fee ?? 0,
      photog2: existingPhotogs.find((p: any) => p.position === 2)?.photographer_id ?? "",
      fee2: existingPhotogs.find((p: any) => p.position === 2)?.fee ?? 0,
      photog3: existingPhotogs.find((p: any) => p.position === 3)?.photographer_id ?? "",
      fee3: existingPhotogs.find((p: any) => p.position === 3)?.fee ?? 0,
    };
  });

  const { data: existingExtras = [] } = useQuery({
    queryKey: ["event_extras", event?.id],
    queryFn: async () => event?.id ? ((await supabase.from("event_extras").select("*").eq("event_id", event.id)).data ?? []) : [],
    enabled: !!event?.id,
  });
  const [extras, setExtras] = useState<any[]>([]);
  useEffect(() => {
    setExtras(existingExtras.map((x: any) => ({ ...x })));
    // total_value stored includes extras → strip them so editing UI shows base value
    const prevSum = existingExtras.reduce((s: number, x: any) => s + Number(x.quantity || 0) * Number(x.unit_price || 0), 0);
    if (prevSum > 0) setForm((f: any) => ({ ...f, total_value: Number(f.total_value || 0) - prevSum }));
  }, [existingExtras]);
  const extrasTotal = extras.reduce((s, x) => s + Number(x.quantity || 0) * Number(x.unit_price || 0), 0);

  const splitFees = (prismCommission: number, photogIds: string[]) => {
    const n = photogIds.filter(Boolean).length;
    if (!n) return [0, 0, 0];
    const each = Number((prismCommission / n).toFixed(2));
    return [photogIds[0] ? each : 0, photogIds[1] ? each : 0, photogIds[2] ? each : 0];
  };
  const recalcFees = (next: any) => {
    const [f1, f2, f3] = splitFees(Number(next.prism_commission || 0), [next.photog1, next.photog2, next.photog3]);
    return { ...next, fee1: f1, fee2: f2, fee3: f3 };
  };

  const onPkg = (id: string) => {
    const p = packages.find((x: any) => x.id === id);
    setForm(recalcFees({ ...form, package_id: id, total_value: p?.base_price ?? form.total_value }));
  };
  const onPrism = (val: string) => setForm(recalcFees({ ...form, prism_commission: val }));
  const onPhotog = (slot: "photog1" | "photog2" | "photog3", v: string) =>
    setForm(recalcFees({ ...form, [slot]: v }));
  const onWp = (id: string) => {
    const wp = wps.find((x: any) => x.id === id);
    const commission = wp ? Number(form.total_value) * (wp.commission_percentage / 100) : 0;
    setForm({ ...form, wedding_planner_id: id, wp_commission_value: commission });
  };

  const addExtra = () => {
    const t: ExtraType = "Outro";
    setExtras([...extras, { extra_type: t, description: "", quantity: 1, unit_price: EXTRA_DEFAULT_PRICE[t], photographer_id: null }]);
  };
  const updateExtra = (i: number, patch: any) => {
    const next = [...extras];
    next[i] = { ...next[i], ...patch };
    if (patch.extra_type) next[i].unit_price = EXTRA_DEFAULT_PRICE[patch.extra_type as ExtraType] ?? next[i].unit_price;
    setExtras(next);
  };
  const removeExtra = (i: number) => setExtras(extras.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.event_date || !form.client_name) return toast.error("Data e cliente obrigatórios");
    const baseTotal = Number(form.total_value || 0);
    const grandTotal = baseTotal + extrasTotal;
    const payload = {
      event_date: form.event_date, client_name: form.client_name, email: form.email || null,
      pax: form.pax ? Number(form.pax) : null, location: form.location || null,
      event_type: form.event_type, package_id: form.package_id || null,
      total_value: grandTotal, prism_commission: Number(form.prism_commission || 0),
      wedding_planner_id: form.wedding_planner_id || null,
      wp_commission_value: Number(form.wp_commission_value || 0),
      has_pens_caixa: form.has_pens_caixa, adjudication_date: form.adjudication_date || null,
      deposit_amount: Number(form.deposit_amount || 0), deposit_method: form.deposit_method || null,
      deposit_paid_date: form.deposit_paid_date || null,
      final_payment_value: form.final_payment_value ? Number(form.final_payment_value) : null,
      final_payment_date: form.final_payment_date || null, final_payment_method: form.final_payment_method || null,
      internal_notes: form.internal_notes || null, event_notes: form.event_notes || null,
      status: form.status,
    };
    let eventId = event?.id;
    if (isEdit) {
      const { error } = await supabase.from("events").update(payload).eq("id", event.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("events").insert(payload).select().single();
      if (error) return toast.error(error.message);
      eventId = data.id;
    }
    await supabase.from("event_photographers").delete().eq("event_id", eventId);
    const rows = [
      { pos: 1, photog: form.photog1, fee: form.fee1 },
      { pos: 2, photog: form.photog2, fee: form.fee2 },
      { pos: 3, photog: form.photog3, fee: form.fee3 },
    ].filter((r) => r.photog).map((r) => ({ event_id: eventId, photographer_id: r.photog, position: r.pos, fee: Number(r.fee || 0) }));
    if (rows.length) {
      const { error } = await supabase.from("event_photographers").insert(rows);
      if (error) return toast.error(error.message);
    }
    await supabase.from("event_extras").delete().eq("event_id", eventId);
    if (extras.length) {
      const extraRows = extras.map((x) => ({
        event_id: eventId,
        extra_type: x.extra_type,
        description: x.description || null,
        quantity: Number(x.quantity || 0),
        unit_price: Number(x.unit_price || 0),
        total: Number(x.quantity || 0) * Number(x.unit_price || 0),
        photographer_id: x.photographer_id || null,
      }));
      const { error } = await supabase.from("event_extras").insert(extraRows);
      if (error) return toast.error(error.message);
    }
    toast.success("Evento guardado");
    onSaved();
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{isEdit ? "Editar evento" : "Novo evento"}</DialogTitle></DialogHeader>
      <div className="grid md:grid-cols-2 gap-3">
        <F label="Data"><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></F>
        <F label="Status">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EVENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Cliente"><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></F>
        <F label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
        <F label="Pax"><Input type="number" value={form.pax} onChange={(e) => setForm({ ...form, pax: e.target.value })} /></F>
        <F label="Local"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></F>
        <F label="Tipo">
          <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Pacote">
          <Select value={form.package_id} onValueChange={onPkg}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} v{p.version} ({p.base_price}€)</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Valor pacote"><Input type="number" step="0.01" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value })} /></F>
        <F label="Comissão Prism"><Input type="number" step="0.01" value={form.prism_commission} onChange={(e) => onPrism(e.target.value)} /></F>
        <F label="Wedding Planner">
          <Select value={form.wedding_planner_id || "none"} onValueChange={(v) => onWp(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Nenhum</SelectItem>{wps.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name} ({w.commission_percentage}%)</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Comissão WP"><Input type="number" step="0.01" value={form.wp_commission_value} onChange={(e) => setForm({ ...form, wp_commission_value: e.target.value })} /></F>
        <div className="md:col-span-2 flex items-center gap-2 py-2">
          <Checkbox checked={form.has_pens_caixa} onCheckedChange={(c) => setForm({ ...form, has_pens_caixa: !!c })} id="pc" />
          <label htmlFor="pc" className="text-sm">Pens em caixa (+100€)</label>
        </div>

        <div className="md:col-span-2 border-t pt-3 mt-2"><h4 className="text-sm font-semibold mb-2">Fotógrafos</h4></div>
        <PhotogSlot photographers={photographers} pid={form.photog1} fee={form.fee1} onPid={(v: any) => onPhotog("photog1", v)} onFee={(v: any) => setForm({ ...form, fee1: v })} label="Fotógrafo 1" />
        <PhotogSlot photographers={photographers} pid={form.photog2} fee={form.fee2} onPid={(v: any) => onPhotog("photog2", v)} onFee={(v: any) => setForm({ ...form, fee2: v })} label="Fotógrafo 2" />
        <PhotogSlot photographers={photographers} pid={form.photog3} fee={form.fee3} onPid={(v: any) => onPhotog("photog3", v)} onFee={(v: any) => setForm({ ...form, fee3: v })} label="Fotógrafo 3" />

        <div className="md:col-span-2 border-t pt-3 mt-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Extras</h4>
          <Button type="button" size="sm" variant="outline" onClick={addExtra}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
        </div>
        {extras.map((x, i) => (
          <div key={i} className="md:col-span-2 grid grid-cols-12 gap-2 items-end p-2 rounded bg-muted/40">
            <div className="col-span-3">
              <Label className="text-xs">Tipo</Label>
              <Select value={x.extra_type} onValueChange={(v) => updateExtra(i, { extra_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXTRA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className="text-xs">Descrição</Label>
              <Input value={x.description ?? ""} onChange={(e) => updateExtra(i, { description: e.target.value })} />
            </div>
            <div className="col-span-1">
              <Label className="text-xs">Qt</Label>
              <Input type="number" step="0.01" value={x.quantity} onChange={(e) => updateExtra(i, { quantity: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Preço un.</Label>
              <Input type="number" step="0.01" value={x.unit_price} onChange={(e) => updateExtra(i, { unit_price: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Fotógrafo</Label>
              <Select value={x.photographer_id || "none"} onValueChange={(v) => updateExtra(i, { photographer_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{photographers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.initials}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex justify-end">
              <Button type="button" size="icon" variant="ghost" onClick={() => removeExtra(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="col-span-12 text-xs text-right text-muted-foreground">Subtotal: {EUR(Number(x.quantity || 0) * Number(x.unit_price || 0))}</div>
          </div>
        ))}
        <div className="md:col-span-2 flex justify-between items-center text-sm bg-muted/40 px-3 py-2 rounded">
          <span>Subtotal extras</span><span className="tabular-nums font-medium">{EUR(extrasTotal)}</span>
        </div>
        <div className="md:col-span-2 flex justify-between items-center text-base bg-primary/10 px-3 py-2 rounded">
          <span className="font-medium">Total evento (pacote + extras)</span>
          <span className="tabular-nums font-semibold">{EUR(Number(form.total_value || 0) + extrasTotal)}</span>
        </div>

        <div className="md:col-span-2 border-t pt-3 mt-2"><h4 className="text-sm font-semibold mb-2">Pagamentos</h4></div>
        <F label="Data adjudicação"><Input type="date" value={form.adjudication_date} onChange={(e) => setForm({ ...form, adjudication_date: e.target.value })} /></F>
        <F label="Sinal (€)"><Input type="number" step="0.01" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} /></F>
        <F label="Método sinal"><Input value={form.deposit_method} onChange={(e) => setForm({ ...form, deposit_method: e.target.value })} placeholder="Revolut / Transferência / Cyclik / Outro" /></F>
        <F label="Data sinal pago"><Input type="date" value={form.deposit_paid_date} onChange={(e) => setForm({ ...form, deposit_paid_date: e.target.value })} /></F>
        <F label="Pagamento final (€)"><Input type="number" step="0.01" value={form.final_payment_value} onChange={(e) => setForm({ ...form, final_payment_value: e.target.value })} /></F>
        <F label="Data pag. final"><Input type="date" value={form.final_payment_date} onChange={(e) => setForm({ ...form, final_payment_date: e.target.value })} /></F>
        <F label="Método final" className="md:col-span-2"><Input value={form.final_payment_method} onChange={(e) => setForm({ ...form, final_payment_method: e.target.value })} /></F>

        <F label="Notas internas" className="md:col-span-2"><Textarea rows={3} value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} /></F>
        <F label="Notas evento (calendário)" className="md:col-span-2"><Textarea rows={3} value={form.event_notes} onChange={(e) => setForm({ ...form, event_notes: e.target.value })} /></F>
      </div>
      <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
    </DialogContent>
  );
}

function PhotogSlot({ photographers, pid, fee, onPid, onFee, label }: any) {
  return (
    <div className="md:col-span-2 grid grid-cols-3 gap-2">
      <div className="col-span-2">
        <Label className="text-xs">{label}</Label>
        <Select value={pid || "none"} onValueChange={(v) => onPid(v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="none">—</SelectItem>{photographers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.initials} · {p.full_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Fee €</Label>
        <Input type="number" step="0.01" value={fee} onChange={(e) => onFee(e.target.value)} />
      </div>
    </div>
  );
}

function F({ label, children, className = "" }: any) {
  return <div className={`space-y-1.5 ${className}`}><Label className="text-xs">{label}</Label>{children}</div>;
}
