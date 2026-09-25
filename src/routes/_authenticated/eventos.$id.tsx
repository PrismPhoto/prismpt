import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/components/event-form";
import { ArrowLeft, Trash2, Save, Users, Calendar, Package, Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/eventos/$id")({
  component: EventDetailPage,
});

const fmtLongDate = (d?: string) => {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const s = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "long",
  }).format(date);
  // "sábado, 19 de jun. de 2027" -> "19 jun. 2027, Sábado"
  const parts = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(date);
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${parts.replace(/ de /g, " ")}, ${cap}` || s;
};

function EventDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { role, photographerId } = useAuth();
  const saveRef = useRef<(() => void) | undefined>(undefined);
  const [summary, setSummary] = useState<any>(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, packages(name, version), wedding_planners(name), event_photographers(*, photographers(initials, full_name))")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: packages = [] } = useQuery({ queryKey: ["packages-all"], queryFn: async () => (await supabase.from("packages").select("*")).data ?? [] });
  const { data: wps = [] } = useQuery({ queryKey: ["wps"], queryFn: async () => (await supabase.from("wedding_planners").select("*")).data ?? [] });
  const { data: photographers = [] } = useQuery({ queryKey: ["photogs"], queryFn: async () => (await supabase.from("photographers").select("*").eq("active", true)).data ?? [] });

  const deleteEvent = async () => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Evento eliminado");
    qc.invalidateQueries({ queryKey: ["events"] });
    navigate({ to: "/eventos" });
  };

  if (isLoading) return <PageContainer><div className="p-8 text-muted-foreground">A carregar…</div></PageContainer>;
  if (!event) return <PageContainer><div className="p-8 text-muted-foreground">Evento não encontrado.</div></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title={event.client_name}
        description={`${event.event_type} · ${event.event_date}`}
        actions={
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/eventos"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link>
            </Button>
            <Button size="sm" onClick={() => saveRef.current?.()}><Save className="h-4 w-4 mr-1" />Guardar</Button>
            {role === "manager" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm"><Trash2 className="h-4 w-4 mr-1" />Eliminar</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar este evento?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acção é irreversível. Fotógrafos e extras associados também serão removidos.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteEvent}>Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <Chip icon={<Heart className="h-3.5 w-3.5" />} value={summary?.client_name || event.client_name || "—"} />
        <Chip icon={<Calendar className="h-3.5 w-3.5" />} value={fmtLongDate(summary?.event_date || event.event_date)} />
        <Chip icon={<Users className="h-3.5 w-3.5" />} value={summary?.photographers || "Sem fotógrafos"} />
        <Chip icon={<Package className="h-3.5 w-3.5" />} value={summary?.packageLabel || "Sem pacote"} />
      </div>

      <EventForm
        event={event}
        packages={packages}
        wps={wps}
        photographers={photographers}
        saveRef={saveRef}
        onSummaryChange={setSummary}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["event", id] });
          qc.invalidateQueries({ queryKey: ["events"] });
        }}
      />
    </PageContainer>
  );
}

function Chip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-medium truncate max-w-[22rem]">{value}</span>
    </div>
  );
}
