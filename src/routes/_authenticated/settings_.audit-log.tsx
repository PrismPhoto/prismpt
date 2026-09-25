import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/settings_/audit-log")({
  head: () => ({ meta: [{ title: "Registo de alterações · PRISM" }] }),
  component: AuditLogPage,
});

const TABLES: Record<string, string> = {
  events: "Eventos",
  event_photographers: "Fotógrafos do evento",
  event_extras: "Extras",
  leads: "Leads",
  photographers: "Fotógrafos",
};
const IGNORE = new Set(["updated_at", "created_at"]);

const fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

function diff(o: any, n: any) {
  const keys = new Set([...Object.keys(o ?? {}), ...Object.keys(n ?? {})]);
  const out: { k: string; a: unknown; b: unknown }[] = [];
  for (const k of keys) {
    if (IGNORE.has(k)) continue;
    const a = o?.[k], b = n?.[k];
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) out.push({ k, a, b });
  }
  return out;
}

function AuditLogPage() {
  const { role, loading } = useAuth();
  const [table, setTable] = useState("all");
  const [userF, setUserF] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["audit-log", table, from, to],
    enabled: role === "manager",
    queryFn: async () => {
      let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (table !== "all") q = q.eq("table_name", table);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", `${to}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const users = useMemo(() => [...new Set(rows.map((r: any) => r.user_email ?? "Sistema"))].sort(), [rows]);
  const list = rows.filter((r: any) => userF === "all" || (r.user_email ?? "Sistema") === userF);

  if (loading) return <PageContainer><p>A carregar…</p></PageContainer>;
  if (role !== "manager") return <PageContainer><p className="text-muted-foreground">Acesso reservado ao Admin.</p></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title="Registo de alterações" description="Quem alterou o quê, mais recentes primeiro"
        actions={<Button variant="ghost" size="sm" asChild><Link to="/settings"><ArrowLeft className="h-4 w-4 mr-1" />Definições</Link></Button>} />
      <Card className="mb-4"><CardContent className="p-4 flex flex-wrap gap-3 items-center">
        <Select value={table} onValueChange={setTable}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas as tabelas</SelectItem>{Object.entries(TABLES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={userF} onValueChange={setUserF}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os utilizadores</SelectItem>{users.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-sm text-muted-foreground">até</span>
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="ml-auto text-sm text-muted-foreground">{list.length} registos</div>
      </CardContent></Card>

      <div className="space-y-2">
        {isLoading && <p className="text-muted-foreground">A carregar…</p>}
        {!isLoading && list.length === 0 && <p className="text-muted-foreground">Sem registos.</p>}
        {list.map((r: any) => {
          const changes = r.action === "UPDATE" ? diff(r.old_values, r.new_values) : [];
          const rec = r.new_values ?? r.old_values ?? {};
          const name = rec.client_name ?? rec.full_name ?? rec.description ?? rec.external_name ?? r.record_id;
          return (
            <Card key={r.id}><CardContent className="p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabular-nums text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-PT")}</span>
                <span className="font-medium">{r.user_email ?? "Sistema"}</span>
                <Badge variant={r.action === "DELETE" ? "destructive" : r.action === "INSERT" ? "default" : "secondary"}>
                  {r.action === "INSERT" ? "Criou" : r.action === "DELETE" ? "Eliminou" : "Alterou"}
                </Badge>
                <span>{TABLES[r.table_name] ?? r.table_name}</span>
                <span className="text-muted-foreground truncate max-w-[20rem]">· {name}</span>
              </div>
              {changes.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs">
                  {changes.map((c) => (
                    <li key={c.k}><span className="font-mono text-muted-foreground">{c.k}</span>: <span className="line-through text-muted-foreground">{fmt(c.a)}</span> → <span className="font-medium">{fmt(c.b)}</span></li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
