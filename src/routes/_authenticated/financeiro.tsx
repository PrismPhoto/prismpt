import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { EUR, fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { PrismFinance } from "@/components/prism-finance";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{"title": "Financeiro — PRISM"}, {"name": "description", "content": "Receitas, comissões e pagamentos PRISM."}, {"property": "og:title", "content": "Financeiro — PRISM"}, {"property": "og:description", "content": "Receitas, comissões e pagamentos PRISM."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}] }), component: FinancePage });

function FinancePage() {
  const { role, photographerId } = useAuth();
  const navigate = useNavigate();
  const [year, setYear] = useState(2027);
  const [photogF, setPhotogF] = useState("all");

  const { data: photographers = [] } = useQuery({ queryKey: ["photogs-all"], queryFn: async () => (await supabase.from("photographers").select("*")).data ?? [] });

  const { data: rows = [] } = useQuery({
    queryKey: ["finance", year, photogF],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await supabase.from("events")
        .select("*, event_photographers(*, photographers(initials, full_name)), event_extras(*), wedding_planners(name)")
        .eq("event_year", year)
        .order("event_date");
      return data ?? [];
    },
  });

  const filtered = role !== "photographer" && photogF === "all"
    ? rows
    : rows.filter((e: any) => e.event_photographers?.some((ep: any) => ep.photographer_id === (role === "photographer" ? photographerId : photogF)));

  // Extras attributed to a specific photographer count toward their fee
  const extrasForPhotographer = (e: any, photographerId: string) =>
    (e.event_extras || [])
      .filter((x: any) => x.photographer_id === photographerId)
      .reduce((s: number, x: any) => s + Number(x.total || 0), 0);

  const feeWithExtras = (e: any, ep: any) => Number(ep.fee || 0) + extrasForPhotographer(e, ep.photographer_id);

  // Amount still owed to the photographer (perspective of the photographer):
  // any final_payment_received counts as paid, regardless of method.
  // For externals (no photographer_id), payment value = fee.
  const finalCreditFor = (ep: any) => {
    if (!ep.final_payment_received) return 0;
    const isExternal = !ep.photographer_id;
    return isExternal ? Number(ep.fee || 0) : Number(ep.final_payment_value || 0);
  };
  const owedToPhotographer = (e: any, ep: any) => {
    const total = feeWithExtras(e, ep);
    const depositCredit = ep.deposit_paid ? Number(ep.deposit_amount || 0) : 0;
    return total - depositCredit - finalCreditFor(ep);
  };
  const paidToPhotographer = (_e: any, ep: any) => {
    const depositCredit = ep.deposit_paid ? Number(ep.deposit_amount || 0) : 0;
    return depositCredit + finalCreditFor(ep);
  };


  const activePhotographerId = role === "photographer"
    ? photographerId
    : (photogF !== "all" ? photogF : null);

  const totalRevenue = filtered.reduce((s, e) => s + Number(e.total_value || 0), 0);
  const allFeeRows = filtered.flatMap((e: any) =>
    (e.event_photographers || [])
      .filter((ep: any) => !activePhotographerId || ep.photographer_id === activePhotographerId)
      .map((ep: any) => ({ ep, e }))
  );
  const totalFees = allFeeRows.reduce((s, { ep, e }) => s + feeWithExtras(e, ep), 0);
  const totalFeesPaid = allFeeRows.reduce((s, { ep, e }) => s + paidToPhotographer(e, ep), 0);
  const totalCommission = allFeeRows.reduce((s, { ep }) => s + Number(ep.prism_commission || 0), 0);
  const totalReceived = filtered.reduce((s, e) => s + (e.deposit_paid === true ? Number(e.deposit_amount || 0) : 0) + Number(e.final_payment_date ? e.final_payment_value || 0 : 0), 0);
  const totalPending = totalRevenue - totalReceived;

  // Per photographer balance
  const balances: Record<string, { initials: string; full_name: string; owed: number; paid: number; commission: number }> = {};
  allFeeRows.forEach(({ ep, e }) => {
    const k = ep.photographer_id;
    if (!k) return; // skip external photographers (no internal balance)
    if (!balances[k]) balances[k] = { initials: ep.photographers?.initials ?? "?", full_name: ep.photographers?.full_name ?? "", owed: 0, paid: 0, commission: 0 };
    balances[k].owed += feeWithExtras(e, ep);
    balances[k].paid += paidToPhotographer(e, ep);
    balances[k].commission += Number(ep.prism_commission || 0);
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
            {role === "manager" && (
              <Select value={photogF} onValueChange={setPhotogF}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos fotógrafos</SelectItem>{photographers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.initials}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </>
        }
      />

      {role === "manager" && !activePhotographerId && <PrismFinance year={year} />}

      {role === "manager" && !activePhotographerId && <SinaisSection rows={rows} photographers={photographers} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {role === "manager" && !activePhotographerId && <KPI label="Receita" value={EUR(totalRevenue)} />}
        {role === "manager" && !activePhotographerId && <KPI label="Recebido" value={EUR(totalReceived)} />}
        {role === "manager" && !activePhotographerId && <KPI label="Pendente" value={EUR(totalPending)} />}
        <KPI label="Fees totais" value={EUR(totalFees)} />
        <KPI label="Fees pagos" value={EUR(totalFeesPaid)} />
        <KPI label={activePhotographerId ? "Por receber" : "Por pagar"} value={EUR(totalFees - totalFeesPaid)} />
        <KPI label="Comissões PRISM" value={EUR(totalCommission)} />
      </div>

      {role === "manager" && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Caixa por fotógrafo</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground"><tr><th className="text-left p-2">Fotógrafo</th><th className="text-right p-2">a receber</th><th className="text-right p-2">Pago</th><th className="text-right p-2">Comissão PRISM</th><th className="text-right p-2">Saldo</th></tr></thead>
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
                  <th className="text-left p-3">Fees</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e: any) => (
                  <tr
                    key={e.id}
                    className="border-t cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => navigate({ to: "/eventos/$id", params: { id: e.id } })}
                  >
                    <td className="p-3 whitespace-nowrap">{fmtDate(e.event_date)}</td>
                    <td className="p-3">{e.client_name}</td>
                    {role === "manager" && <td className="p-3 text-right tabular-nums">{EUR(e.total_value)}</td>}
                    {role === "manager" && <td className="p-3 text-right tabular-nums">{e.deposit_paid_date ? EUR(e.deposit_amount) : <span className="text-muted-foreground">—</span>}</td>}
                    {role === "manager" && <td className="p-3 text-right tabular-nums">{e.final_payment_date ? EUR(e.final_payment_value) : <span className="text-muted-foreground">—</span>}</td>}
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
                {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sem dados</td></tr>}
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

// --- Sinais — Onde está o dinheiro ----------------------------------------
const isRevolutPrism = (m: any) => String(m ?? "").toLowerCase().includes("revolut");
const isDirecto = (m: any) => String(m ?? "").toLowerCase().startsWith("directo:");
const isCyclik = (m: any) => String(m ?? "").toLowerCase().includes("cyclik");
const directoInitials = (m: any) => String(m ?? "").split(":")[1]?.trim() ?? "";

function SinaisSection({ rows, photographers }: { rows: any[]; photographers: any[] }) {
  // Um sinal conta como pago apenas quando deposit_paid é true (sem fallback por data).
  const paid = rows.filter((e: any) => e.deposit_paid === true);
  const unpaid = rows.filter((e: any) => !e.deposit_paid);

  // Só contam como Revolut PRISM os sinais cujo método inclui "revolut".
  const revolut = paid.filter((e) => isRevolutPrism(e.deposit_method));

  const directo = paid.filter((e) => isDirecto(e.deposit_method));
  const cyclik = paid.filter((e) => isCyclik(e.deposit_method));

  const sum = (list: any[]) => list.reduce((s, e) => s + Number(e.deposit_amount || 0), 0);
  // O total inclui todos os sinais, inclusive os que não têm método registado.
  const totalAll = sum(paid) + sum(unpaid);

  // Devoluções aos fotógrafos: linhas de event_photographers com sinal pago, valor > 0 e data,
  // em eventos cujo sinal entrou no Revolut PRISM. A diferença é a comissão retida pela PRISM.
  const revolutIds = new Set(revolut.map((e: any) => e.id));
  let devolvido = 0;
  let retido = 0;
  revolut.forEach((e: any) => {
    const dev = (e.event_photographers ?? []).reduce(
      (s: number, ep: any) =>
        s + (ep.deposit_paid && ep.deposit_paid_date && Number(ep.deposit_amount || 0) > 0 ? Number(ep.deposit_amount) : 0),
      0,
    );
    if (dev > 0) {
      devolvido += dev;
      retido += Number(e.deposit_amount || 0) - dev;
    }
  });
  const saldoRevolut = sum(revolut) - devolvido;



  // Agrupar sinais directos por fotógrafo (iniciais em 'directo:XX')
  const byInitials: Record<string, { name: string; count: number; total: number }> = {};
  directo.forEach((e) => {
    const ini = directoInitials(e.deposit_method).toUpperCase();
    const p = photographers.find((ph: any) => String(ph.initials ?? "").toUpperCase() === ini);
    const key = ini || "?";
    if (!byInitials[key]) byInitials[key] = { name: p?.full_name ?? key, count: 0, total: 0 };
    byInitials[key].count += 1;
    byInitials[key].total += Number(e.deposit_amount || 0);
  });
  const directoRows = Object.entries(byInitials).sort((a, b) => b[1].total - a[1].total);

  const unpaidSorted = [...unpaid].sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)));

  const cards = [
    { label: "Directo Fotógrafos", list: directo, cls: "border-l-amber-500", txt: "text-amber-600 dark:text-amber-400" },
    ...(cyclik.length > 0 ? [{ label: "Cyclik (ZD)", list: cyclik, cls: "border-l-blue-500", txt: "text-blue-600 dark:text-blue-400" }] : []),
    { label: "Por Pagar", list: unpaid, cls: "border-l-red-500", txt: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="mb-6 space-y-4">
      <h2 className="text-lg font-semibold">Sinais — Onde está o dinheiro</h2>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className={`border-l-4 ${c.cls}`}>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className={`text-xl font-semibold mt-1 tabular-nums ${c.txt}`}>{EUR(sum(c.list))}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.list.length} evento{c.list.length === 1 ? "" : "s"}</div>
            </CardContent>
          </Card>
        ))}
        <Card className="border-l-4 border-l-muted-foreground/40">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Sinais</div>
            <div className="text-xl font-semibold mt-1 tabular-nums">{EUR(totalAll)}</div>
            <div className="text-xs text-muted-foreground mt-1">{paid.length + unpaid.length} eventos</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Directo aos fotógrafos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Fotógrafo</th>
                  <th className="text-right p-3">Nº Sinais</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Deve à PRISM</th>
                </tr>
              </thead>
              <tbody>
                {directoRows.map(([ini, d]) => (
                  <tr key={ini} className="border-t">
                    <td className="p-3">{ini} · {d.name}</td>
                    <td className="p-3 text-right tabular-nums">{d.count}</td>
                    <td className="p-3 text-right tabular-nums">{EUR(d.total)}</td>
                    <td className="p-3 text-right tabular-nums font-medium text-amber-600 dark:text-amber-400">{EUR(d.total)}</td>
                  </tr>
                ))}
                {directoRows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sem sinais directos</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Sinais por pagar</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Noivos</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-right p-3">Sinal</th>
                  <th className="text-left p-3">Fotógrafos</th>
                </tr>
              </thead>
              <tbody>
                {unpaidSorted.map((e: any) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3">{e.client_name}</td>
                    <td className="p-3 whitespace-nowrap">{fmtDate(e.event_date)}</td>
                    <td className="p-3 text-right tabular-nums">{EUR(e.deposit_amount)}</td>
                    <td className="p-3">
                      {(e.event_photographers || [])
                        .map((ep: any) => ep.photographers?.initials ?? ep.external_name)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                  </tr>
                ))}
                {unpaidSorted.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Todos os sinais pagos</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
