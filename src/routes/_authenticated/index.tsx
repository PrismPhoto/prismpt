import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { EUR, EVENT_TYPES, fmtDate } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { role } = useAuth();
  const [year, setYear] = useState(2027);
  const [type, setType] = useState<string>("all");

  const { data: stats } = useQuery({
    queryKey: ["dashboard", year, type],
    queryFn: async () => {
      let q = supabase.from("events").select("*").eq("event_year", year);
      if (type !== "all") q = q.eq("event_type", type as any);
      const { data: events } = await q;

      const totalRevenue = (events ?? []).reduce((s, e) => s + Number(e.total_value || 0), 0);
      const totalReceived = (events ?? []).reduce(
        (s, e) => s + Number(e.deposit_paid_date ? e.deposit_amount || 0 : 0) + Number(e.final_payment_date ? e.final_payment_value || 0 : 0),
        0
      );
      const totalPending = totalRevenue - totalReceived;

      const upcoming = (events ?? [])
        .filter((e) => {
          const d = new Date(e.event_date);
          const now = new Date();
          const in30 = new Date(); in30.setDate(in30.getDate() + 30);
          return d >= now && d <= in30;
        })
        .sort((a, b) => a.event_date.localeCompare(b.event_date))
        .slice(0, 8);

      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      const { data: photogs } = await supabase.from("photographers").select("id, initials, full_name");
      const { data: eps } = await supabase
        .from("event_photographers")
        .select("photographer_id, event_id, events!inner(event_year, event_type)")
        .eq("events.event_year", year);

      const perPhotog: Record<string, number> = {};
      (eps ?? []).forEach((ep: any) => {
        if (type !== "all" && ep.events.event_type !== type) return;
        perPhotog[ep.photographer_id] = (perPhotog[ep.photographer_id] || 0) + 1;
      });

      return {
        totalEvents: events?.length ?? 0,
        totalRevenue, totalReceived, totalPending,
        upcoming, leads: leads ?? [],
        perPhotog: (photogs ?? []).map((p) => ({ ...p, count: perPhotog[p.id] || 0 })),
      };
    },
  });

  if (role !== "manager") {
    return (
      <PageContainer>
        <PageHeader title="Bem-vindo" description="Aceda aos seus eventos no menu lateral." />
      </PageContainer>
    );
  }

  const years = [2027, 2028, 2029, 2030];

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Visão geral do ano"
        actions={
          <>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label="Eventos" value={stats?.totalEvents ?? 0} />
        <KPI label="Adjudicado" value={EUR(stats?.totalRevenue)} />
        <KPI label="Recebido" value={EUR(stats?.totalReceived)} />
        <KPI label="Pendente" value={EUR(stats?.totalPending)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Próximos 30 dias</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats?.upcoming.length === 0 && <p className="text-sm text-muted-foreground">Sem eventos próximos.</p>}
            {stats?.upcoming.map((e) => (
              <div key={e.id} className="flex justify-between items-center text-sm border-b last:border-0 pb-2">
                <div>
                  <div className="font-medium">{e.client_name}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(e.event_date)} · {e.event_type}</div>
                </div>
                <Badge variant={e.status === "Confirmado" ? "default" : "secondary"}>{e.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Leads recentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats?.leads.length === 0 && <p className="text-sm text-muted-foreground">Sem leads.</p>}
            {stats?.leads.map((l) => (
              <div key={l.id} className="flex justify-between items-center text-sm border-b last:border-0 pb-2">
                <div>
                  <div className="font-medium">{l.client_name}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(l.event_date)} · {l.event_type}</div>
                </div>
                <Badge variant="outline">{l.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Eventos por fotógrafo ({year})</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {stats?.perPhotog.map((p) => (
              <div key={p.id} className="text-center p-3 rounded-md border bg-muted/30">
                <div className="text-2xl font-semibold">{p.count}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.initials}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function KPI({ label, value }: { label: string; value: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
