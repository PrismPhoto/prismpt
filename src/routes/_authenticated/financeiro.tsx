import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { EUR, EVENT_TYPES, fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/financeiro")({ component: FinancePage });

function FinancePage() {
  const { role, photographerId } = useAuth();
  const [year, setYear] = useState(2027);
  const [typeF, setTypeF] = useState("all");
  const [photogF, setPhotogF] = useState(role === "manager" ? "all" : photographerId ?? "");

  const { data: photographers = [] } = useQuery({ queryKey: ["photogs-all"], queryFn: async () => (await supabase.from("photographers").select("*")).data ?? [] });

  const { data: rows = [] } = useQuery({
    queryKey: ["finance", year, typeF, photogF],
    queryFn: async () => {
      let q = supabase.from("events")
        .select("*, event_photographers(*, photographers(initials, full_name, prism_commission)), event_extras(*), wedding_planners(name)")
        .eq("event_year", year)
        .order("event_date");
      if (typeF !== "all") q = q.eq("event_type", typeF as any);
      const { data } = await q;
      return data ?? [];
    },
  });

  const filtered = role === "manager" && photogF === "all"
    ? rows
    : rows.filter((e: any) => e.event_photographers?.some((ep: any) => ep.photographer_id === (role === "manager" ? photogF : photographerId)));

  // Extras attributed to a specific photographer count toward their fee
  const extrasForPhotographer = (e: any, photographerId: string) =>
    (e.event_extras || [])
      .filter((x: any) => x.photographer_id === photographerId)
      .reduce((s: number, x: any) => s + Number(x.total || 0), 0);

  const feeWithExtras = (e: any, ep: any) => Number(ep.fee || 0) + extrasForPhotographer(e, ep.photographer_id);

  // Amount PRISM still owes the photographer:
  // fee+extras - deposit_amount (if returned) - final_payment_value (only when paid via PRISM)
  const owedToPhotographer = (e: any, ep: any) => {
    const total = feeWithExtras(e, ep);
    const depositCredit = ep.deposit_paid ? Number(ep.deposit_amount || 0) : 0;
    const finalCredit = ep.final_payment_received && ep.final_payment_method === "prism"
      ? Number(ep.final_payment_value || 0)
      : 0;
    return total - depositCredit - finalCredit;
  };
  const paidToPhotographer = (e: any, ep: any) => {
    const depositCredit = ep.deposit_paid ? Number(ep.deposit_amount || 0) : 0;
    const finalCredit = ep.final_payment_received && ep.final_payment_method === "prism"
      ? Number(ep.final_payment_value || 0)
      : 0;
    return depositCredit + finalCredit;
  };

  const activePhotographerId = role === "photographer"
    ? photographerId
    : (photogF !== "all" ? photogF : null);

  const totalRevenue = filtered.reduce((s, e) => s + Number(e.total_value || 0), 0);
  const totalWp = filtered.reduce((s, e) => s + Number(e.wp_commission_value || 0), 0);
  const allFeeRows = filtered.flatMap((e: any) =>
    (e.event_photographers || [])
      .filter((ep: any) => !activePhotographerId || ep.photographer_id === activePhotographerId)
      .map((ep: any) => ({ ep, e }))
  );
  const totalFees = allFeeRows.reduce((s, { ep, e }) => s + feeWithExtras(e, ep), 0);
  const totalFeesPaid = allFeeRows.reduce((s, { ep, e }) => s + paidToPhotographer(e, ep), 0);
  const totalCommission = allFeeRows.reduce((s, { ep }) => s + Number(ep.photographers?.prism_commission || 0), 0);
  const totalReceived = filtered.reduce((s, e) => s + Number(e.deposit_paid_date ? e.deposit_amount || 0 : 0) + Number(e.final_payment_date ? e.final_payment_value || 0 : 0), 0);
  const totalPending = totalRevenue - totalReceived;

  // Per photographer balance
  const balances: Record<string, { initials: string; full_name: string; owed: number; paid: number; commission: number }> = {};
  allFeeRows.forEach(({ ep, e }) => {
    const k = ep.photographer_id;
    if (!balances[k]) balances[k] = { initials: ep.photographers?.initials ?? "?", full_name: ep.photographers?.full_name ?? "", owed: 0, paid: 0, commission: 0 };
    balances[k].owed += feeWithExtras(e, ep);
    balances[k].paid += paidToPhotographer(e, ep);
    balances[k].commission += Number(ep.photographers?.prism_commission || 0);
  });


  const years = [2027, 2028, 2029, 2030];

  return (
    <PageContainer>
      <PageHeader
        title="Financeiro"
        description={role === "photographer" ? "A sua caixa" : "Resumo financeiro"}
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
            {role === "manager" && (
              <Select value={photogF} onValueChange={setPhotogF}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos fotógrafos</SelectItem>{photographers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.initials}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {role === "manager" && !activePhotographerId && <KPI label="Receita" value={EUR(totalRevenue)} />}
        {role === "manager" && !activePhotographerId && <KPI label="Recebido" value={EUR(totalReceived)} />}
        {role === "manager" && !activePhotographerId && <KPI label="Pendente" value={EUR(totalPending)} />}
        {role === "manager" && !activePhotographerId && <KPI label="Comissões WP" value={EUR(totalWp)} />}
        <KPI label="Fees totais" value={EUR(totalFees)} />
        <KPI label="Fees pagos" value={EUR(totalFeesPaid)} />
        <KPI label="Por pagar" value={EUR(totalFees - totalFeesPaid)} />
        <KPI label="Comissões PRISM" value={EUR(totalCommission)} />
      </div>

      {role === "manager" && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Caixa por fotógrafo</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground"><tr><th className="text-left p-2">Fotógrafo</th><th className="text-right p-2">A pagar</th><th className="text-right p-2">Pago</th><th className="text-right p-2">Comissão PRISM</th><th className="text-right p-2">Saldo</th></tr></thead>
              <tbody>
                {Object.values(balances).map((b) => (
                  <tr key={b.initials} className="border-t">
                    <td className="p-2">{b.initials} · {b.full_name}</td>
                    <td className="p-2 text-right tabular-nums">{EUR(b.owed)}</td>
                    <td className="p-2 text-right tabular-nums">{EUR(b.paid)}</td>
                    <td className="p-2 text-right tabular-nums">{EUR(b.commission)}</td>
                    <td className="p-2 text-right tabular-nums font-medium">{EUR(b.owed - b.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhe por evento</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Data</th><th className="text-left p-3">Cliente</th>
                  {role === "manager" && <th className="text-right p-3">Valor</th>}
                  {role === "manager" && <th className="text-right p-3">Sinal</th>}
                  {role === "manager" && <th className="text-right p-3">Final</th>}
                  {role === "manager" && <th className="text-right p-3">WP</th>}
                  <th className="text-left p-3">Fees</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e: any) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">{fmtDate(e.event_date)}</td>
                    <td className="p-3">{e.client_name}</td>
                    {role === "manager" && <td className="p-3 text-right tabular-nums">{EUR(e.total_value)}</td>}
                    {role === "manager" && <td className="p-3 text-right tabular-nums">{e.deposit_paid_date ? EUR(e.deposit_amount) : <span className="text-muted-foreground">—</span>}</td>}
                    {role === "manager" && <td className="p-3 text-right tabular-nums">{e.final_payment_date ? EUR(e.final_payment_value) : <span className="text-muted-foreground">—</span>}</td>}
                    {role === "manager" && <td className="p-3 text-right tabular-nums">{e.wp_commission_value ? EUR(e.wp_commission_value) : <span className="text-muted-foreground">—</span>}</td>}
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {e.event_photographers?.filter((ep: any) => role === "manager" || ep.photographer_id === photographerId).map((ep: any) => {
                          const owed = owedToPhotographer(e, ep);
                          const variant = owed <= 0 ? "default" : ep.deposit_paid ? "secondary" : "outline";
                          return (
                            <Badge key={ep.id} variant={variant} className="text-xs">
                              {ep.photographers?.initials}: {EUR(feeWithExtras(e, ep))} {owed > 0 ? `(falta ${EUR(owed)})` : ""}
                            </Badge>
                          );
                        })}

                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sem dados</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function KPI({ label, value }: { label: string; value: any }) {
  return (
    <Card><CardContent className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
    </CardContent></Card>
  );
}
