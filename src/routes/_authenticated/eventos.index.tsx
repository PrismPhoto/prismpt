import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_STATUSES, EVENT_TYPES, EUR, fmtDate, packageLabel, packageLabelWithPrice, sortPackages } from "@/lib/format";
import { Plus, Download, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { syncGoogleCalendar } from "@/lib/calendar-sync.functions";

export const Route = createFileRoute("/_authenticated/eventos/")({ component: EventsPage });

function EventsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [year, setYear] = useState(2027);
  const [typeF, setTypeF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const runSync = useServerFn(syncGoogleCalendar);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await runSync({ data: undefined } as any);
      if (res.imported > 0) toast.success(`${res.imported} eventos novos importados`);
      else toast.info("Nenhum evento novo encontrado");
      qc.invalidateQueries({ queryKey: ["events"] });
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (msg.includes("NOT_CONNECTED")) toast.error("Liga primeiro o Google Calendar nas Definições");
      else toast.error(`Falha na sincronização: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  const { data: events = [] } = useQuery({
    queryKey: ["events", year, typeF, statusF],
    queryFn: async () => {
      let q = supabase.from("events").select("*, packages(name, version), wedding_planners(name), event_photographers(*, photographers(initials, full_name))").eq("event_year", year).order("event_date");
      if (typeF !== "all") q = q.eq("event_type", typeF as any);
      if (statusF !== "all") q = q.eq("status", statusF as any);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: packages = [] } = useQuery({ queryKey: ["packages-all"], queryFn: async () => (await supabase.from("packages").select("*")).data ?? [] });

  const years = [2027, 2028, 2029, 2030];

  const exportCsv = () => {
    const rows = [
      ["Data", "Cliente", "Tipo", "Pacote", "Valor", "WP", "Comissão WP", "Status"],
      ...events.map((e: any) => [
        e.event_date, e.client_name, e.event_type, e.packages ? packageLabel(e.packages.name, e.packages.version) : "", e.total_value,
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
              <Button variant="outline" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {syncing ? "A sincronizar…" : "Sincronizar Calendário"}
              </Button>
            )}
            {role === "manager" && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo evento</Button></DialogTrigger>
                <QuickCreateDialog
                  packages={packages}
                  onCreated={(id: string) => {
                    setCreateOpen(false);
                    qc.invalidateQueries({ queryKey: ["events"] });
                    navigate({ to: "/eventos/$id", params: { id } });
                  }}
                />
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
                  <tr
                    key={e.id}
                    className="border-t hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate({ to: "/eventos/$id", params: { id: e.id } })}
                  >
                    <td className="p-3 whitespace-nowrap">{fmtDate(e.event_date)}</td>
                    <td className="p-3 font-medium">{e.client_name}</td>
                    <td className="p-3"><Badge variant="outline">{e.event_type}</Badge></td>
                    <td className="p-3 text-muted-foreground">{e.packages ? packageLabel(e.packages.name, e.packages.version) : "—"}</td>
                    <td className="p-3 text-xs">{e.event_photographers?.map((ep: any) => ep.photographers?.initials ?? ep.external_name ?? "?").join(" · ")}</td>
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

function QuickCreateDialog({ packages, onCreated }: any) {
  const [form, setForm] = useState({
    event_date: "",
    client_name: "",
    event_type: "Casamento",
    package_id: "",
  });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!form.event_date || !form.client_name) return toast.error("Data e cliente obrigatórios");
    setSaving(true);
    const pkg = packages.find((p: any) => p.id === form.package_id);
    const { data, error } = await supabase
      .from("events")
      .insert({
        event_date: form.event_date,
        client_name: form.client_name,
        event_type: form.event_type as any,
        package_id: form.package_id || null,
        total_value: pkg?.base_price ?? 0,
      })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Evento criado — preenche o resto na página");
    onCreated(data.id);
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Novo evento</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Data</Label>
          <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cliente (referência interna)</Label>
          <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="ex.: Ana & João" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Pacote (opcional)</Label>
          <Select value={form.package_id || "none"} onValueChange={(v) => setForm({ ...form, package_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {sortPackages(packages as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{packageLabelWithPrice(p.name, p.version, p.base_price)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">Depois de criar, abre-se a página completa com todos os detalhes do casamento.</p>
      </div>
      <DialogFooter>
        <Button onClick={create} disabled={saving}>{saving ? "A criar…" : "Criar e abrir"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
