import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Folder, ExternalLink, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({ meta: [{ title: "Recursos PRISM" }, { name: "description", content: "Links partilhados da equipa PRISM: assets, presets e templates." }] }),
  component: ResourcesPage,
});

const CATS: Record<string, string> = { assets: "Assets & Logos", presets: "Presets de Edição", templates: "Templates", other: "Outros" };
const empty = { title: "", url: "", category: "assets", description: "", sort_order: 0 };

function ResourcesPage() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const isAdmin = role === "manager";
  const [edit, setEdit] = useState<any>(null);
  const { data: items = [] } = useQuery({
    queryKey: ["shared-resources"],
    queryFn: async () => (await supabase.from("shared_resources").select("*").order("sort_order").order("title")).data ?? [],
  });
  const cats = [...Object.keys(CATS), ...Array.from(new Set(items.map((i: any) => i.category))).filter((c) => !CATS[c as string])] as string[];

  const save = async () => {
    if (!edit.title.trim() || !edit.url.trim()) return toast.error("Título e URL obrigatórios");
    let url = edit.url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const payload = { title: edit.title.trim(), url, category: edit.category.trim() || "other", description: edit.description || null, sort_order: Number(edit.sort_order) || 0 };
    const { error } = edit.id
      ? await supabase.from("shared_resources").update(payload).eq("id", edit.id)
      : await supabase.from("shared_resources").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Guardado"); setEdit(null);
    qc.invalidateQueries({ queryKey: ["shared-resources"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Remover este link?")) return;
    const { error } = await supabase.from("shared_resources").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["shared-resources"] });
  };

  return (
    <PageContainer>
      <PageHeader title="Recursos PRISM" description="Pastas e ficheiros partilhados da equipa"
        actions={isAdmin && <Button onClick={() => setEdit({ ...empty })}><Plus className="h-4 w-4 mr-2" />Adicionar link</Button>} />
      <div className="grid gap-4 md:grid-cols-2">
        {cats.map((c) => {
          const list = items.filter((i: any) => i.category === c);
          if (!list.length && !isAdmin) return null;
          return (
            <Card key={c}>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Folder className="h-5 w-5 text-primary" />{CATS[c] ?? c}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {!list.length && <p className="text-sm text-muted-foreground">Sem links.</p>}
                {list.map((i: any) => (
                  <div key={i.id} className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-muted group">
                    <a href={i.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">{i.title}<ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      {i.description && <div className="text-xs text-muted-foreground">{i.description}</div>}
                    </a>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEdit({ ...i, description: i.description ?? "" })}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!items.length && !isAdmin && <p className="text-sm text-muted-foreground">Ainda não há recursos partilhados.</p>}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar link" : "Novo link"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
              <div><Label>URL (ex.: link do Google Drive)</Label><Input value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} /></div>
              <div><Label>Categoria</Label>
                <Select value={edit.category} onValueChange={(v) => setEdit({ ...edit, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{CATS[c] ?? c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Textarea rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
              <div><Label>Ordem</Label><Input type="number" value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
