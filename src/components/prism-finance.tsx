import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const FREQ: Record<string, string> = { monthly: "Mensal", annual: "Anual", one_time: "Pontual" };
const CAT: Record<string, string> = { management: "Gestão", social_media: "Social media", software: "Software", team_events: "Eventos equipa", other: "Outro" };

// Custo mensalizado de uma despesa num dado mês (one_time conta no mês de start_date)
function expenseForMonth(x: any, year: number, month: number) {
  if (!x.active) return 0;
  if (x.start_date) {
    const d = new Date(x.start_date);
    const sy = d.getFullYear(), sm = d.getMonth() + 1;
    if (x.frequency === "one_time") return sy === year && sm === month ? Number(x.amount) : 0;
    if (year < sy || (year === sy && month < sm)) return 0;
  } else if (x.frequency === "one_time") return 0;
  if (x.frequency === "monthly") return Number(x.amount);
  if (x.frequency === "annual") return Number(x.amount) / 12;
  return 0;
}

export function PrismFinance({ year }: { year: number }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["prism-finance", year],
    queryFn: async () => {
      const [ev, ph, co, ex] = await Promise.all([
        supabase.from("events").select("id, event_date, status, total_value, deposit_amount, deposit_paid, wp_commission_value, event_photographers(prism_commission)").eq("event_year", year),
        supabase.from("photographers").select("id, initials, full_name, active").order("initials"),
        supabase.from("photographer_contributions").select("*").eq("year", year),
        supabase.from("prism_expenses").select("*").order("created_at"),
      ]);
      return { events: ev.data ?? [], photographers: ph.data ?? [], contributions: co.data ?? [], expenses: ex.data ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["prism-finance", year] });
  const events = (data?.events ?? []).filter((e: any) => e.status !== "Cancelado");
  const photographers = data?.photographers ?? [];
  const contributions = data?.contributions ?? [];
  const expenses = data?.expenses ?? [];

  const commissionOf = (e: any) => (e.event_photographers ?? []).reduce((s: number, x: any) => s + Number(x.prism_commission || 0), 0);
  const revenue = events.reduce((s: number, e: any) => s + Number(e.total_value || 0), 0);
  const depPaid = events.filter((e: any) => e.deposit_paid);
  const depUnpaid = events.filter((e: any) => !e.deposit_paid && e.status === "Confirmado");
  const sumDep = (l: any[]) => l.reduce((s, e) => s + Number(e.deposit_amount || 0), 0);
  const prismComm = events.reduce((s: number, e: any) => s + commissionOf(e), 0);
  const wpComm = events.reduce((s: number, e: any) => s + Number(e.wp_commission_value || 0), 0);

  // P&L por mês
  const pl = MONTHS.map((_, i) => {
    const m = i + 1;
    const comm = events.filter((e: any) => new Date(e.event_date).getMonth() + 1 === m).reduce((s: number, e: any) => s + commissionOf(e), 0);
    const contrib = contributions.filter((c: any) => c.month === m && c.paid).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    const cost = expenses.reduce((s: number, x: any) => s + expenseForMonth(x, year, m), 0);
    return { m, comm, contrib, cost, result: comm + contrib - cost };
  });
  const tot = pl.reduce((a, r) => ({ comm: a.comm + r.comm, contrib: a.contrib + r.contrib, cost: a.cost + r.cost, result: a.result + r.result }), { comm: 0, contrib: 0, cost: 0, result: 0 });

  return (
    <div className="space-y-6 mb-8">
      {/* D — P&L */}
      <Card>
        <CardHeader><CardTitle className="text-base">P&L PRISM {year}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Mini label="Comissões PRISM" value={EUR(tot.comm)} />
            <Mini label="Contribuições pagas" value={EUR(tot.contrib)} />
            <Mini label="Custos fixos" value={EUR(tot.cost)} />
            <Mini label="Resultado" value={EUR(tot.result)} tone={tot.result >= 0 ? "pos" : "neg"} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead className="text-muted-foreground"><tr><th className="text-left p-1.5"></th>{MONTHS.map((m) => <th key={m} className="text-right p-1.5">{m}</th>)}<th className="text-right p-1.5">Ano</th></tr></thead>
              <tbody>
                {([["Comissões", "comm"], ["Contribuições", "contrib"], ["Custos", "cost"], ["Resultado", "result"]] as const).map(([l, k]) => (
                  <tr key={k} className={cn("border-t", k === "result" && "font-semibold")}>
                    <td className="p-1.5">{l}</td>
                    {pl.map((r) => <td key={r.m} className={cn("p-1.5 text-right", k === "result" && (r.result < 0 ? "text-destructive" : ""))}>{Math.round(r[k])}</td>)}
                    <td className="p-1.5 text-right">{Math.round(tot[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* A — Receitas e comissões */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Mini label="Receita total" value={EUR(revenue)} />
        <Mini label={`Sinais pagos (${depPaid.length})`} value={EUR(sumDep(depPaid))} />
        <Mini label={`Sinais por pagar (${depUnpaid.length})`} value={EUR(sumDep(depUnpaid))} />
        <Mini label="Comissões PRISM" value={EUR(prismComm)} />
        <Mini label="Comissões WP" value={EUR(wpComm)} />
      </div>

      <Contributions year={year} photographers={photographers} contributions={contributions} refresh={refresh} />
      <Expenses expenses={expenses} refresh={refresh} />
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-semibold mt-1 tabular-nums", tone === "neg" && "text-destructive")}>{value}</div>
    </CardContent></Card>
  );
}

function Contributions({ year, photographers, contributions, refresh }: any) {
  const [edit, setEdit] = useState<any>(null);
  const now = new Date();
  const active = photographers.filter((p: any) => p.active || contributions.some((c: any) => c.photographer_id === p.id));
  const find = (pid: string, m: number) => contributions.find((c: any) => c.photographer_id === pid && c.month === m);

  const generate = async () => {
    const rows = photographers.filter((p: any) => p.active).flatMap((p: any) =>
      MONTHS.map((_, i) => ({ photographer_id: p.id, month: i + 1, year })));
    const { error } = await supabase.from("photographer_contributions").upsert(rows, { onConflict: "photographer_id,month,year", ignoreDuplicates: true });
    if (error) return toast.error(error.message);
    toast.success("Registos gerados"); refresh();
  };
  const toggle = async (c: any) => {
    const paid = !c.paid;
    const { error } = await supabase.from("photographer_contributions").update({ paid, paid_date: paid ? new Date().toISOString().slice(0, 10) : null }).eq("id", c.id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const saveEdit = async () => {
    const { error } = await supabase.from("photographer_contributions").update({
      amount: Number(edit.amount || 0), paid: edit.paid, paid_date: edit.paid ? (edit.paid_date || null) : null, notes: edit.notes || null,
    }).eq("id", edit.id);
    if (error) return toast.error(error.message);
    setEdit(null); refresh();
  };
  const isPast = (m: number) => year < now.getFullYear() || (year === now.getFullYear() && m < now.getMonth() + 1);
  const grand = contributions.filter((c: any) => c.paid).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Contribuições dos fotógrafos</CardTitle>
        <Button size="sm" variant="outline" onClick={generate}>Gerar {year} para activos</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="text-left p-1.5">Fotógrafo</th>{MONTHS.map((m) => <th key={m} className="p-1.5 text-center">{m}</th>)}<th className="text-right p-1.5">Pago</th></tr></thead>
          <tbody>
            {active.map((p: any) => {
              const total = contributions.filter((c: any) => c.photographer_id === p.id && c.paid).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-1.5 whitespace-nowrap">{p.initials}</td>
                  {MONTHS.map((_, i) => {
                    const c = find(p.id, i + 1);
                    if (!c) return <td key={i} className="p-1.5 text-center text-muted-foreground">·</td>;
                    const tone = c.paid ? "bg-green-500/15" : isPast(i + 1) ? "bg-destructive/15" : "bg-muted";
                    return (
                      <td key={i} className="p-1">
                        <div className={cn("rounded px-1 py-1 flex flex-col items-center gap-0.5", tone)}>
                          <Checkbox checked={c.paid} onCheckedChange={() => toggle(c)} />
                          <button type="button" className="text-[10px] leading-none text-muted-foreground hover:underline" onClick={() => setEdit({ ...c })}>
                            {c.paid && c.paid_date ? c.paid_date.slice(5).split("-").reverse().join("/") : `${Number(c.amount)}€`}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-1.5 text-right tabular-nums font-medium">{EUR(total)}</td>
                </tr>
              );
            })}
            {active.length === 0 && <tr><td colSpan={14} className="p-4 text-center text-muted-foreground">Sem fotógrafos</td></tr>}
            <tr className="border-t font-semibold"><td className="p-1.5" colSpan={13}>Total</td><td className="p-1.5 text-right tabular-nums">{EUR(grand)}</td></tr>
          </tbody>
        </table>
      </CardContent>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        {edit && (
          <DialogContent>
            <DialogHeader><DialogTitle>Contribuição {MONTHS[edit.month - 1]} {edit.year}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Valor (€)</Label><Input type="number" step="0.01" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Checkbox checked={edit.paid} onCheckedChange={(v) => setEdit({ ...edit, paid: !!v })} /><Label>Pago</Label></div>
              {edit.paid && <div><Label>Data de pagamento</Label><Input type="date" value={edit.paid_date ?? ""} onChange={(e) => setEdit({ ...edit, paid_date: e.target.value })} /></div>}
              <div><Label>Notas</Label><Textarea value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={saveEdit}>Guardar</Button></DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}

function Expenses({ expenses, refresh }: any) {
  const [edit, setEdit] = useState<any>(null);
  const monthly = expenses.filter((x: any) => x.active).reduce((s: number, x: any) =>
    s + (x.frequency === "monthly" ? Number(x.amount) : x.frequency === "annual" ? Number(x.amount) / 12 : 0), 0);
  const save = async () => {
    const payload = {
      description: edit.description, amount: Number(edit.amount || 0), frequency: edit.frequency, category: edit.category,
      start_date: edit.start_date || null, active: edit.active, notes: edit.notes || null,
    };
    const { error } = edit.id
      ? await supabase.from("prism_expenses").update(payload).eq("id", edit.id)
      : await supabase.from("prism_expenses").insert(payload);
    if (error) return toast.error(error.message);
    setEdit(null); refresh();
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Custos fixos PRISM <span className="text-muted-foreground font-normal text-sm">· {EUR(monthly)}/mês</span></CardTitle>
        <Button size="sm" onClick={() => setEdit({ description: "", amount: 0, frequency: "monthly", category: "other", active: true })}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Descrição</th><th className="text-left p-3">Categoria</th><th className="text-left p-3">Frequência</th><th className="text-right p-3">Valor</th><th className="text-right p-3">/mês</th></tr></thead>
          <tbody>
            {expenses.map((x: any) => (
              <tr key={x.id} className={cn("border-t cursor-pointer hover:bg-muted/40", !x.active && "opacity-50")} onClick={() => setEdit({ ...x })}>
                <td className="p-3">{x.description}{!x.active && " (inactivo)"}</td>
                <td className="p-3">{CAT[x.category] ?? x.category}</td>
                <td className="p-3">{FREQ[x.frequency] ?? x.frequency}</td>
                <td className="p-3 text-right tabular-nums">{EUR(x.amount)}</td>
                <td className="p-3 text-right tabular-nums">{x.frequency === "monthly" ? EUR(x.amount) : x.frequency === "annual" ? EUR(Number(x.amount) / 12) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        {edit && (
          <DialogContent>
            <DialogHeader><DialogTitle>{edit.id ? "Editar" : "Novo"} custo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Descrição</Label><Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor (€)</Label><Input type="number" step="0.01" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></div>
                <div><Label>Início</Label><Input type="date" value={edit.start_date ?? ""} onChange={(e) => setEdit({ ...edit, start_date: e.target.value })} /></div>
                <div><Label>Frequência</Label>
                  <Select value={edit.frequency} onValueChange={(v) => setEdit({ ...edit, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(FREQ).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Categoria</Label>
                  <Select value={edit.category} onValueChange={(v) => setEdit({ ...edit, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CAT).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2"><Checkbox checked={edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: !!v })} /><Label>Activo</Label></div>
              <div><Label>Notas</Label><Textarea value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}
