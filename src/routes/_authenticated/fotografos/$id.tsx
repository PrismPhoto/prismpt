import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EUR, fmtDate, packageLabel } from "@/lib/format";
import { computeSlotFee, extrasForPhotographer, sumExtras, type SlotDistribution } from "@/lib/fee-distribution";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fotografos/$id")({ component: PhotogProfile });

const YEARS = [2027, 2028, 2029, 2030];

/** Parte do pacote (sem extras): fee guardado no evento, ou calculado pela distribuição do pacote. */
function packageFee(row: any, photog: any): number {
  const stored = Number(row?.fee || 0);
  if (stored > 0) return stored;
  const dist = row?.events?.packages?.fee_distribution;
  if (!Array.isArray(dist) || dist.length === 0) return 0;
  const idx = Math.max(0, (Number(row?.position) || 1) - 1);
  const baseValue = Number(row?.events?.total_value || 0) - sumExtras(row?.events?.event_extras);
  return computeSlotFee(
    dist as SlotDistribution[],
    idx,
    baseValue,
    Number(photog?.prism_commission || 0),
  );
}


function PhotogProfile() {
  const { id } = Route.useParams();
  const [year, setYear] = useState<number>(2027);

  const { data: photog, isLoading: photogLoading } = useQuery({
    queryKey: ["photog", id],
    queryFn: async () => (await supabase.from("photographers").select("*").eq("id", id).maybeSingle()).data,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["photog-events", id, year, photog?.prism_commission],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_photographers")
        .select(
          "*, events!inner(id, event_date, client_name, event_type, status, total_value, event_extras(*), packages(name, version, fee_distribution))",
        )
        .eq("photographer_id", id)
        .gte("events.event_date", `${year}-01-01`)
        .lte("events.event_date", `${year}-12-31`);
      if (error) throw error;
      const rows = (data ?? []).map((r: any) => {
        const base = packageFee(r, photog);
        const extras = extrasForPhotographer(r?.events?.event_extras, r.photographer_id);
        return { ...r, baseFee: base, extrasFee: extras, effFee: base + extras };
      });
      rows.sort((a: any, b: any) => a.events.event_date.localeCompare(b.events.event_date));
      return rows;

    },
  });

  const { data: unavailable = [] } = useQuery({
    queryKey: ["photog-unav", id],
    queryFn: async () => (await supabase.from("photographer_unavailability").select("*").eq("photographer_id", id).order("date")).data ?? [],
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = assignments.filter((a: any) => a.events.event_date >= today);
  const past = assignments.filter((a: any) => a.events.event_date < today);

  // Datas em que este fotógrafo está atribuído a mais do que um evento
  const conflictDates = new Set(
    Object.entries(
      assignments.reduce((acc: Record<string, number>, a: any) => {
        if (a.events?.status === "Cancelado") return acc;
        acc[a.events.event_date] = (acc[a.events.event_date] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .filter(([, n]) => (n as number) > 1)
      .map(([d]) => d),
  );

  const paidFor = (a: any) => {
    const dep = a.deposit_paid ? Number(a.deposit_amount || 0) : 0;
    const fin = a.final_payment_received ? Number(a.final_payment_value || 0) : 0;
    return dep + fin;
  };
  const totalFees = assignments.reduce((s: number, a: any) => s + Number(a.effFee || 0), 0);
  const totalPaid = assignments.reduce((s: number, a: any) => s + paidFor(a), 0);
  const totalPending = totalFees - totalPaid;

  if (photogLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!photog) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-lg text-muted-foreground">Fotógrafo não encontrado</p>
          <Link to="/fotografos">
            <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={photog?.full_name ?? "—"}
        description={`${photog?.initials ?? ""} · ${photog?.email ?? "Sem email"}`}
        actions={
          <>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Link to="/fotografos">
              <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
            </Link>
          </>
        }
      />

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Stat label={`Faturado ${year}`} value={EUR(totalFees)} />
        <Stat label="Pago" value={EUR(totalPaid)} tone="success" />
        <Stat label="Pendente" value={EUR(totalPending)} tone="warning" />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Próximos eventos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <EventTable rows={upcoming} conflictDates={conflictDates} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Histórico {year}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <EventTable rows={past} conflictDates={conflictDates} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Indisponibilidades</CardTitle></CardHeader>
        <CardContent>
          {unavailable.length === 0 && <p className="text-sm text-muted-foreground">Sem dias marcados.</p>}
          <div className="flex flex-wrap gap-2">
            {unavailable.map((u: any) => (
              <Badge key={u.id} variant="secondary">{fmtDate(u.date)}{u.notes ? ` · ${u.notes}` : ""}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  const cls = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "";
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}

function EventTable({ rows, conflictDates }: { rows: any[]; conflictDates?: Set<string> }) {
  if (!rows.length) return <div className="p-6 text-sm text-muted-foreground text-center">Sem eventos.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase">
          <tr>
            <th className="text-left p-3">Data</th>
            <th className="text-left p-3">Cliente</th>
            <th className="text-left p-3">Pacote</th>
            <th className="text-right p-3">Extras</th>
            <th className="text-right p-3">Fee</th>

            <th className="text-left p-3">Sinal devolvido</th>
            <th className="text-left p-3">Pag. final</th>
            <th className="text-left p-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const status = r.final_payment_received ? "Pago" : r.deposit_paid ? "Sinal" : "Pendente";
            const variant: any = r.final_payment_received ? "default" : r.deposit_paid ? "secondary" : "outline";
            return (
              <tr key={r.id} className="border-t">
                <td className="p-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    {fmtDate(r.events.event_date)}
                    {conflictDates?.has(r.events.event_date) && (
                      <span title="Tem mais do que um evento nesta data"><AlertTriangle className="h-4 w-4 text-destructive" /></span>
                    )}
                  </span>
                </td>
                <td className="p-3 font-medium">{r.events.client_name}</td>
                <td className="p-3 text-muted-foreground">{r.events.packages ? packageLabel(r.events.packages.name, r.events.packages.version) : "—"}</td>
                <td className="p-3 text-right tabular-nums text-muted-foreground">{Number(r.extrasFee || 0) > 0 ? `+${EUR(r.extrasFee)}` : "—"}</td>
                <td className="p-3 text-right tabular-nums font-medium">{EUR(r.effFee ?? r.fee)}</td>

                <td className="p-3 text-xs">
                  {r.deposit_paid
                    ? <span>{EUR(r.deposit_amount)}{r.deposit_paid_date ? ` · ${fmtDate(r.deposit_paid_date)}` : ""}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="p-3 text-xs">
                  {r.final_payment_received
                    ? <span>{EUR(r.final_payment_value)} · {r.final_payment_method === "fotografo" ? "direto" : "PRISM"}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="p-3"><Badge variant={variant}>{status}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
