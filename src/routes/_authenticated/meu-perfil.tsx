import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/meu-perfil")({ component: MyProfileRedirect });

function MyProfileRedirect() {
  const { photographerId, loading } = useAuth();
  if (loading) return <PageContainer><p className="text-muted-foreground">A carregar…</p></PageContainer>;
  if (!photographerId) return <PageContainer><p className="text-muted-foreground">Perfil de fotógrafo não encontrado.</p></PageContainer>;
  return <Navigate to="/fotografos/$id" params={{ id: photographerId }} />;
}
