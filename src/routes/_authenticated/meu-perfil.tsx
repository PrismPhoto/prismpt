import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/meu-perfil")({
  head: () => ({ meta: [{"title": "Meu Perfil — PRISM"}, {"name": "description", "content": "Acesso ao perfil pessoal na equipa PRISM."}, {"property": "og:title", "content": "Meu Perfil — PRISM"}, {"property": "og:description", "content": "Acesso ao perfil pessoal na equipa PRISM."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}] }), component: MyProfileRedirect });

function MyProfileRedirect() {
  const { photographerId, loading } = useAuth();
  if (loading) return <PageContainer><p className="text-muted-foreground">A carregar…</p></PageContainer>;
  if (!photographerId) return <PageContainer><p className="text-muted-foreground">Perfil de fotógrafo não encontrado.</p></PageContainer>;
  return <Navigate to="/fotografos/$id" params={{ id: photographerId }} />;
}
