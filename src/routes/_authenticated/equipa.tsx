import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/lib/format";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/equipa")({
  component: TeamPage,
  head: () => ({
    meta: [
      { title: "Equipa | PRISM Management" },
      { name: "description", content: "Consulte a agenda de casamentos de cada fotógrafo da equipa PRISM." },
      { property: "og:title", content: "Equipa | PRISM Management" },
      { property: "og:description", content: "Consulte a agenda de casamentos de cada fotógrafo da equipa PRISM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const YEARS = [2027, 2028, 2029, 2030];

function TeamPage() {
  const [year, setYear] = useState(2027);

  const { data: photographers = [] } = useQuery({
    queryKey: ["team-photogs"],
    queryFn: async () =>
      (await supabase.from("photographers").select("*").eq("active", true).order("initials")).data ?? [],
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["team-assignments", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_photographers")
        .select("photographer_id, events!inner(id, event_date, client_name, status)")
        .gte("events.event_date", `${year}-01-01`)
        .lte("events.event_date", `${year}-12-31`);
      if (error) throw error;
      return data ?? [];
    },
  });

  const byPhotog: Record<string, any[]> = {};
  for (const a of assignments as any[]) {
    if (!a.photographer_id) continue;
    (byPhotog[a.photographer_id] ||= []).push(a.events);
  }
  for (const k of Object.keys(byPhotog)) {
    byPhotog[k].sort((a, b) => a.event_date.localeCompare(b.event_date));
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <PageContainer>
      <PageHeader
        title="Equipa"
        description="Agenda de casamentos de cada fotógrafo PRISM"
        actions={
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        }
      />

      <div className="grid md:grid-cols-2 gap-4">
        {photographers.map((p: any) => {
          const rows = byPhotog[p.id] ?? [];
          const next = rows.filter((e) => e.event_date >= today).slice(0, 4);
          return (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground">{p.initials}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{rows.length} casamento{rows.length === 1 ? "" : "s"}</Badge>
                    <Link to="/fotografos/$id" params={{ id: p.id }} className="text-muted-foreground hover:text-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                {next.length === 0 && <p className="text-sm text-muted-foreground">Sem casamentos próximos em {year}.</p>}
                <div className="space-y-1.5">
                  {next.map((e) => (
                    <Link
                      key={e.id}
                      to="/eventos/$id"
                      params={{ id: e.id }}
                      className="flex justify-between text-sm border-b last:border-0 pb-1.5 hover:text-primary"
                    >
                      <span className="font-medium truncate">{e.client_name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{fmtDate(e.event_date)}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
