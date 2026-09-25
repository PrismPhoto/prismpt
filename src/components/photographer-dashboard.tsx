import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EUR, fmtDate } from "@/lib/format";
import { DELIVERY_LABELS, DELIVERY_DOT, daysUntil, countdownClass, deliveryKey } from "@/lib/delivery";
import { netBreakdown } from "@/lib/net";

export function PhotographerDashboard({ year, isManager, photographerId }: { year: number; isManager: boolean; photographerId: string | null }) {
  const [sel, setSel] = useState<string>("all");
  const target = isManager ? sel : photographerId;

  const { data: photogs = [] } = useQuery({
    queryKey: ["photogs-active"],
    queryFn: async () => (await supabase.from("photographers").select("id, initials, full_name").eq("active", true).order("initials")).data ?? [],
    enabled: isManager,
  });

  const { data } = useQuery({
    queryKey: ["photog-dashboard", year, target],
    enabled: !!target,
    queryFn: async () => {
      const { data: events } = await supabase
        .from("events")
        .select("*, packages(name, version), event_photographers(photographer_id, prism_commission)")
        .eq("event_year", year)
        .neq("status", "Cancelado");
      const rows = (events ?? [])
        .filter((e: any) => target === "all" || (e.event_photographers ?? []).some((ep: any) => ep.photographer_id === target))
        .map((e: any) => ({
          ...e,
          b: netBreakdown({ ...e, commission: (e.event_photographers ?? []).reduce((s: number, x: any) => s + Number(x.prism_commission || 0), 0) }),
        }));
      return rows;
    },
  });

  const rows = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter((e) => e.event_date > today).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const pending = rows
    .filter((e) => e.delivery_status !== "delivered" && e.event_date < today)
    .sort((a, b) => String(a.delivery_deadline ?? "9").localeCompare(String(b.delivery_deadline ?? "9")));
  const gross = rows.reduce((s, e) => s + e.b.gross, 0);
  const net = rows.reduce((s, e) => s + e.b.net, 0);

  if (!target) return null;

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{isManager ? "Dashboard do fotógrafo" : "O meu ano"}</h2>
        {isManager && (
          <Select value={sel} onValueChange={setSel}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {photogs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.initials} · {p.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Casamentos alocados" value={rows.length} />
        <Kpi label="Por fazer" value={upcoming.length} />
        <Kpi label="Entregas pendentes" value={pending.length} />
        <Kpi label="Receita bruta" value={EUR(gross)} />
        <Kpi label="Resultado líquido" value={EUR(net)} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Próximos eventos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Sem eventos por fazer.</p>}
            {upcoming.slice(0, 10).map((e) => {
              const k = deliveryKey(e);
              const d = daysUntil(e.event_date);
              return (
                <Link key={e.id} to="/eventos/$id" params={{ id: e.id }} className="flex justify-between items-center gap-3 text-sm border-b last:border-0 pb-2 hover:bg-muted/40 rounded px-1">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.couple_names || e.client_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {fmtDate(e.event_date)} · {e.reception_location || e.location || "—"} · {e.packages?.name ?? "—"} · {EUR(e.b.gross)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span title={DELIVERY_LABELS[k]} className={`inline-block h-2.5 w-2.5 rounded-full ${DELIVERY_DOT[k]}`} />
                    <span className="text-xs text-muted-foreground">{d}d</span>
                    <span className="font-medium">{EUR(e.b.net)}</span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Entregas pendentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.length === 0 && <p className="text-sm text-muted-foreground">Tudo entregue.</p>}
            {pending.map((e) => {
              const d = daysUntil(e.delivery_deadline);
              return (
                <Link key={e.id} to="/eventos/$id" params={{ id: e.id }} className="flex justify-between items-center gap-3 text-sm border-b last:border-0 pb-2 hover:bg-muted/40 rounded px-1">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.couple_names || e.client_name}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(e.event_date)} · prazo {e.delivery_deadline ? fmtDate(e.delivery_deadline) : "—"}</div>
                  </div>
                  <span className={`text-xs rounded px-2 py-0.5 shrink-0 ${countdownClass(d)}`}>
                    {d === null ? "—" : d < 0 ? `Vencido há ${-d}d` : `${d}d`}
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <Card><CardContent className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </CardContent></Card>
  );
}
