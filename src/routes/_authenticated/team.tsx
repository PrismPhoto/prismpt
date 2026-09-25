import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Conversa da Equipa — PRISM" }, { name: "description", content: "Conversa, ideias e bugs da equipa PRISM." }] }),
  component: TeamPage,
});

const CATS: Record<string, string> = { general: "Geral", idea: "Ideia", bug: "Bug" };

function TeamPage() {
  const qc = useQueryClient();
  const { user, role, photographerId } = useAuth();
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState("");
  const [cat, setCat] = useState("general");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: comments = [] } = useQuery({
    queryKey: ["team-comments"],
    queryFn: async () => (await supabase.from("team_comments").select("*").order("created_at", { ascending: true }).limit(500)).data ?? [],
    refetchInterval: 15000,
  });
  const { data: authors = [] } = useQuery({
    queryKey: ["team-authors"],
    queryFn: async () => ((await supabase.rpc("team_comment_authors")).data ?? []) as any[],
  });
  const authorMap = new Map(authors.map((a: any) => [a.id, a]));
  const shown = comments.filter((c: any) => filter === "all" || c.category === filter);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [shown.length]);

  const send = async () => {
    if (!msg.trim() || !user) return;
    const { error } = await supabase.from("team_comments").insert({ message: msg.trim(), category: cat, user_id: user.id, photographer_id: photographerId });
    if (error) return toast.error(error.message);
    setMsg("");
    qc.invalidateQueries({ queryKey: ["team-comments"] });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("team_comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["team-comments"] });
  };

  return (
    <PageContainer>
      <PageHeader title="Conversa da Equipa" description="Partilhe ideias, reporte bugs ou converse com a equipa" />
      <div className="flex gap-2 mb-3">
        {[["all", "Todos"], ["general", "Geral"], ["idea", "Ideias"], ["bug", "Bugs"]].map(([k, l]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{l}</Button>
        ))}
      </div>
      <div className="border rounded-lg bg-card flex flex-col h-[calc(100vh-240px)] min-h-[400px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {shown.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Ainda não há mensagens.</p>}
          {shown.map((c: any) => {
            const a: any = authorMap.get(c.user_id);
            const name = a?.full_name ?? "—";
            const ini = a?.initials ?? name.split(" ").map((w: string) => w[0]).join("").slice(0, 3).toUpperCase();
            return (
              <div key={c.id} className="flex gap-3 group">
                <div className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">{ini}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</span>
                    <Badge variant={c.category === "bug" ? "destructive" : c.category === "idea" ? "default" : "secondary"}>{CATS[c.category]}</Badge>
                    {role === "manager" && (
                      <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap mt-0.5">{c.message}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div className="border-t p-3 flex gap-2 items-end">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(CATS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={2} className="flex-1 resize-none" placeholder="Escreva uma mensagem…" value={msg} onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <Button onClick={send} disabled={!msg.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </PageContainer>
  );
}
