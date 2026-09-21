import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
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
import { Plus, Download, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { findDuplicatePhotographers } from "@/lib/conflicts";
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
  const [statusF, setStatusF] = useState("all");

  const [pkgF, setPkgF] = useState("all");
  const [photogF, setPhotogF] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupBy, setGroupBy] = useState("month");
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
    queryKey: ["events", year, statusF],
    queryFn: async () => {
      let q = supabase.from("events").select("*, deposit_amount, deposit_paid, packages(name, version), wedding_planners(name), event_photographers(*, photographers(initials, full_name))").eq("event_year", year).order("event_date");
      if (statusF !== "all") q = q.eq("status", statusF as any);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: packages = [] } = useQuery({ queryKey: ["packages-all"], queryFn: async () => (await supabase.from("packages").select("*")).data ?? [] });
  const { data: photographers = [] } = useQuery({ queryKey: ["photogs-list"], queryFn: async () => (await supabase.from("photographers").select("id, initials, full_name").order("initials")).data ?? [] });

  const years = [2027, 2028, 2029, 2030];

  const conflictsByEvent = useMemo(() => findDuplicatePhotographers(events as any[]).byEvent, [events]);

  const filtered = useMemo(() => {
    return (events as any[]).filter((e) => {
      if (pkgF !== "all" && e.package_id !== pkgF) return false;
      if (photogF !== "all" && !(e.event_photographers ?? []).some((ep: any) => ep.photographer_id === photogF)) return false;
      if (dateFrom && String(e.event_date) < dateFrom) return false;
      if (dateTo && String(e.event_date) > dateTo) return false;
      return true;
    });
  }, [events, pkgF, photogF, dateFrom, dateTo]);

  const groups = useMemo(() => {
    const list = filtered;
    if (groupBy === "none") return [{ key: "all", label: "Todos os eventos", rows: list }];
    const map = new Map<string, { label: string; rows: any[] }>();
    const push = (key: string, label: string, row: any) => {
      if (!map.has(key)) map.set(key, { label, rows: [] });
      map.get(key)!.rows.push(row);
    };
    for (const e of list) {
      if (groupBy === "month") {
        const d = new Date(e.event_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(d);
        push(key, label.charAt(0).toUpperCase() + label.slice(1), e);
      } else if (groupBy === "photographer") {
        const eps = e.event_photographers ?? [];
        if (eps.length === 0) push("zz-none", "Sem fotógrafo", e);
        else
          eps.forEach((ep: any) => {
            const label = ep.photographers?.full_name ?? ep.photographers?.initials ?? ep.external_name ?? "Externo";
            push(`p-${ep.photographer_id ?? label}`, label, e);
          });
      } else if (groupBy === "package") {
        push(e.package_id ?? "zz-none", e.packages ? packageLabel(e.packages.name, e.packages.version) : "Sem pacote", e);
      } else if (groupBy === "type") {
        push(e.event_type ?? "zz-none", e.event_type ?? "Sem tipo", e);
      } else if (groupBy === "status") {
        push(e.status ?? "zz-none", e.status ?? "Sem status", e);
      }
    }
    return [...map.entries()]
      .sort((a, b) =>
        groupBy === "month" ? a[0].localeCompare(b[0]) : a[1].label.localeCompare(b[1].label, "pt-PT"),
      )
      .map(([key, v]) => ({ key, label: v.label, rows: v.rows }));
  }, [filtered, groupBy]);

  const exportCsv = () => {
    const rows = [
      ["Data", "Cliente", "Tipo", "Pacote", "Valor", "WP", "Comissão WP", "Status"],
      ...filtered.map((e: any) => [
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

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Pacote</Label>
            <Select value={pkgF} onValueChange={setPkgF}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pacotes</SelectItem>
                {sortPackages(packages as any[]).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{packageLabel(p.name, p.version)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fotógrafo</Label>
            <Select value={photogF} onValueChange={setPhotogF}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os fotógrafos</SelectItem>
                {(photographers as any[]).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.initials} — {p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">De</Label>
            <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Até</Label>
            <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Agrupar por</Label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="photographer">Fotógrafo</SelectItem>
                <SelectItem value="package">Pacote</SelectItem>
                <SelectItem value="type">Tipo</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="none">Sem agrupamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(pkgF !== "all" || photogF !== "all" || dateFrom || dateTo) && (
            <Button variant="ghost" onClick={() => { setPkgF("all"); setPhotogF("all"); setDateFrom(""); setDateTo(""); }}>Limpar filtros</Button>
          )}
          <div className="ml-auto text-sm text-muted-foreground">{filtered.length} eventos</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Pacote</th>
                  <th className="text-left p-3">Fotógrafos</th>
                  <th className="text-left p-3">Sinal</th>
                  <th className="text-right p-3">Valor</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.key}>
                    {groupBy !== "none" && (
                      <tr key={`h-${g.key}`} className="bg-muted/40 border-t">
                        <td colSpan={6} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                          {g.label}
                          <span className="ml-2 font-normal text-muted-foreground normal-case">
                            {g.rows.length} evento{g.rows.length === 1 ? "" : "s"} · {EUR(g.rows.reduce((s: number, r: any) => s + Number(r.total_value || 0), 0))}
                          </span>
                        </td>
                      </tr>
                    )}
                    {g.rows.map((e: any) => (
                      <tr
                        key={`${g.key}-${e.id}`}
                        className="border-t hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate({ to: "/eventos/$id", params: { id: e.id } })}
                      >
                        <td className="p-3 whitespace-nowrap">{fmtDate(e.event_date)}</td>
                        <td className="p-3 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            {e.client_name}
                            {conflictsByEvent[e.id] && (
                              <AlertTriangle
                                className="h-4 w-4 text-destructive"
                                aria-label="Conflito de fotógrafo"
                                titleAccess=""
                                title={`Fotógrafo repetido nesta data: ${conflictsByEvent[e.id].join(", ")}`}
                              />
                            )}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{e.packages ? packageLabel(e.packages.name, e.packages.version) : "—"}</td>
                        <td className="p-3 text-xs">{e.event_photographers?.map((ep: any) => ep.photographers?.initials ?? ep.external_name ?? "?").join(" · ")}</td>
                        <td className="p-3">
                          {e.deposit_paid ? (
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <span className="h-2 w-2 rounded-full bg-primary" />
                              <span className="tabular-nums">{EUR(e.deposit_amount)}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
                              <span className="h-2 w-2 rounded-full bg-destructive" />
                              Em falta
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right tabular-nums">{EUR(e.total_value)}</td>
                        <td className="p-3"><Badge variant={e.status === "Confirmado" ? "default" : e.status === "Cancelado" ? "destructive" : "secondary"}>{e.status}</Badge></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sem eventos</td></tr>}
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
