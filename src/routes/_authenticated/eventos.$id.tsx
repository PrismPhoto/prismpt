import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/components/event-form";
import { ArrowLeft, Trash2 } from "lucide-react";
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

function EventDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { role } = useAuth();

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

      <EventForm
        event={event}
        packages={packages}
        wps={wps}
        photographers={photographers}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["event", id] });
          qc.invalidateQueries({ queryKey: ["events"] });
        }}
      />
    </PageContainer>
  );
}
