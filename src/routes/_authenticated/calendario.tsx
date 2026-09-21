import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { findDuplicatePhotographers } from "@/lib/conflicts";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/calendario")({ component: CalendarPage });

const STATUS_COLOR: Record<string, string> = {
  Confirmado: "bg-success text-success-foreground",
  "Aguarda Sinal": "bg-warning text-warning-foreground",
  Cancelado: "bg-destructive text-destructive-foreground",
  Lead: "bg-info text-info-foreground",
  Off: "bg-muted-foreground/40 text-foreground",
};

function CalendarPage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [photogFilter, setPhotogFilter] = useState("all");
  const [dayOpen, setDayOpen] = useState<string | null>(null);

  const start = new Date(cursor); start.setDate(1);
  const end = new Date(cursor); end.setMonth(end.getMonth() + 1); end.setDate(0);
  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);

  const { data: photographers = [] } = useQuery({ queryKey: ["photogs"], queryFn: async () => (await supabase.from("photographers").select("*").eq("active", true)).data ?? [] });

  const { data: payload } = useQuery({
    queryKey: ["calendar", startISO, endISO, photogFilter],
    queryFn: async () => {
      const { data: events } = await supabase.from("events").select("*, event_photographers(photographer_id, photographers(initials))").gte("event_date", startISO).lte("event_date", endISO);
      const { data: leads } = await supabase.from("leads").select("*").gte("event_date", startISO).lte("event_date", endISO).neq("status", "Arquivo");
      const { data: offs } = await supabase.from("photographer_unavailability").select("*, photographers(initials)").gte("date", startISO).lte("date", endISO);

      const conflicts = findDuplicatePhotographers(events ?? []).byDate;

      const arr: any[] = [];
      (events ?? []).forEach((e: any) => {
        if (photogFilter !== "all" && !e.event_photographers?.some((p: any) => p.photographer_id === photogFilter)) return;
        arr.push({ date: e.event_date, type: "event", id: e.id, label: e.client_name, status: e.status, data: e });
      });
      (leads ?? []).forEach((l: any) => arr.push({ date: l.event_date, type: "lead", id: l.id, label: l.client_name, status: "Lead", data: l }));
      (offs ?? []).forEach((o: any) => {
        if (photogFilter !== "all" && o.photographer_id !== photogFilter) return;
        arr.push({ date: o.date, type: "off", id: o.id, label: `${o.photographers?.initials} off`, status: "Off", data: o });
      });
      return { arr, conflicts };
    },
  });
  const items = payload?.arr ?? [];
  const conflictsByDate: Record<string, string[]> = payload?.conflicts ?? {};

  const grid = useMemo(() => {
    const firstDow = (start.getDay() + 6) % 7; // monday-first
    const daysInMonth = end.getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [cursor, start, end]);

  const dayItems = (d: Date) => {
    const iso = d.toISOString().slice(0, 10);
    return items.filter((i) => i.date === iso);
  };

  const monthName = cursor.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  const dayOpenItems = dayOpen ? items.filter((i) => i.date === dayOpen) : [];

  return (
    <PageContainer>
      <PageHeader
        title="Calendário"
        actions={
          <>
            <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="px-3 py-2 text-sm font-medium capitalize min-w-[160px] text-center">{monthName}</div>
            <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Select value={photogFilter} onValueChange={setPhotogFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{photographers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.initials}</SelectItem>)}</SelectContent>
            </Select>
          </>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-2">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              if (!d) return <div key={i} className="aspect-square" />;
              const its = dayItems(d);
              const iso = d.toISOString().slice(0, 10);
              const isToday = iso === new Date().toISOString().slice(0, 10);
              return (
                <button
                  key={i}
                  onClick={() => its.length && setDayOpen(iso)}
                  className={cn(
                    "min-h-[88px] border rounded-md p-1.5 text-left flex flex-col gap-1 hover:border-primary/40 transition",
                    isToday && "border-primary",
                    conflictsByDate[iso] && "border-destructive"
                  )}
                >
                  <div className="text-xs font-medium flex items-center justify-between gap-1">
                    <span>{d.getDate()}</span>
                    {conflictsByDate[iso] && (
                      <AlertTriangle
                        className="h-3.5 w-3.5 text-destructive"
                        title={`Fotógrafo repetido: ${conflictsByDate[iso].join(", ")}`}
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {its.slice(0, 3).map((i) => (
                      <span key={`${i.type}-${i.id}`} className={cn("text-[10px] px-1.5 py-0.5 rounded truncate", STATUS_COLOR[i.status])}>
                        {i.label}
                      </span>
                    ))}
                    {its.length > 3 && <span className="text-[10px] text-muted-foreground">+{its.length - 3} mais</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!dayOpen} onOpenChange={(o) => !o && setDayOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{dayOpen && fmtDate(dayOpen)}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {dayOpenItems.map((i) => (
              <div key={`${i.type}-${i.id}`} className="border rounded-md p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{i.label}</div>
                    {i.type === "event" && (
                      <>
                        <div className="text-xs text-muted-foreground mt-1">{i.data.event_type} · {i.data.location ?? "—"}</div>
                        <div className="text-xs mt-1">{i.data.event_photographers?.map((p: any) => p.photographers?.initials).join(" · ")}</div>
                        {i.data.event_notes && <div className="text-xs mt-2 italic">{i.data.event_notes}</div>}
                      </>
                    )}
                  </div>
                  <Badge>{i.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
