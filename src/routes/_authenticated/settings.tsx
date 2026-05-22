import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Calendar, Link2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("app_settings").select("*").eq("id", 1).single()).data });
  const { data: templates = [] } = useQuery({ queryKey: ["templates"], queryFn: async () => (await supabase.from("email_templates").select("*").order("name")).data ?? [] });

  const [s, setS] = useState<any>(null);
  useEffect(() => { if (settings) setS(settings); }, [settings]);

  const saveSettings = async () => {
    if (!s) return;
    const { error } = await supabase.from("app_settings").update(s).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Definições guardadas");
    qc.invalidateQueries({ queryKey: ["settings"] });
  };

  if (!s) return <PageContainer><p>A carregar…</p></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title="Definições" description="Apenas manager" />
      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="comunicacao">Comunicação</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automations">Automatismos</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Gmail</CardTitle><CardDescription>Para envio de propostas e follow-ups</CardDescription></CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{s.gmail_connected ? "Ligado" : "Não ligado"}</div>
              <Button variant={s.gmail_connected ? "outline" : "default"} onClick={() => toast.info("OAuth do Google será adicionada numa próxima iteração")}>
                <Link2 className="h-4 w-4 mr-2" />{s.gmail_connected ? "Desligar" : "Ligar Gmail"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Google Calendar</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{s.gcal_connected ? "Ligado" : "Não ligado"}</div>
                <Button variant={s.gcal_connected ? "outline" : "default"} onClick={() => toast.info("OAuth do Google será adicionada numa próxima iteração")}>
                  <Link2 className="h-4 w-4 mr-2" />{s.gcal_connected ? "Desligar" : "Ligar Calendar"}
                </Button>
              </div>
              <div><Label>Calendar ID</Label><Input value={s.gcal_calendar_id ?? ""} onChange={(e) => setS({ ...s, gcal_calendar_id: e.target.value })} placeholder="primary ou ID do calendário" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">Modo rascunho</div>
                <div className="text-xs text-muted-foreground">Nunca envia emails automaticamente sem aprovação</div>
              </div>
              <Switch checked={s.draft_mode} onCheckedChange={(c) => setS({ ...s, draft_mode: c })} />
            </CardContent>
          </Card>
          <Button onClick={saveSettings}>Guardar</Button>
        </TabsContent>

        <TabsContent value="comunicacao" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tom e estilo da PRISM</CardTitle>
              <CardDescription>Descreva como a PRISM comunica com os clientes. Será usado pela IA para gerar emails.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea rows={8} value={s.brand_voice ?? ""} onChange={(e) => setS({ ...s, brand_voice: e.target.value })}
                placeholder="Ex.: A PRISM trata os noivos pelo primeiro nome, com tom caloroso, próximo mas profissional. Usamos frases curtas, evitamos jargão e nunca tratamos por 'caro cliente'. Assinamos como 'Equipa PRISM'." />
            </CardContent>
          </Card>
          <Button onClick={saveSettings}>Guardar</Button>
        </TabsContent>

        <TabsContent value="templates" className="space-y-3 mt-4">
          {templates.map((t: any) => (
            <TemplateEditor key={t.id} template={t} onSaved={() => qc.invalidateQueries({ queryKey: ["templates"] })} />
          ))}
        </TabsContent>

        <TabsContent value="automations" className="space-y-3 mt-4">
          <AutomationRow label="Follow-up após proposta" enabled={s.followup_enabled} onToggle={(c: boolean) => setS({ ...s, followup_enabled: c })}>
            <div className="flex items-center gap-2 text-sm"><span>Após</span><Input className="w-20" type="number" value={s.followup_days} onChange={(e) => setS({ ...s, followup_days: Number(e.target.value) })} /><span>dias</span></div>
          </AutomationRow>
          <AutomationRow label="Pedido de sinal automático" enabled={s.deposit_request_enabled} onToggle={(c: boolean) => setS({ ...s, deposit_request_enabled: c })} />
          <AutomationRow label="Confirmação após sinal" enabled={s.confirmation_enabled} onToggle={(c: boolean) => setS({ ...s, confirmation_enabled: c })} />
          <AutomationRow label="Lembrete pré-evento" enabled={s.pre_event_reminder_enabled} onToggle={(c: boolean) => setS({ ...s, pre_event_reminder_enabled: c })}>
            <div className="flex items-center gap-2 text-sm"><Input className="w-20" type="number" value={s.pre_event_reminder_days} onChange={(e) => setS({ ...s, pre_event_reminder_days: Number(e.target.value) })} /><span>dias antes</span></div>
          </AutomationRow>
          <Button onClick={saveSettings}>Guardar</Button>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function AutomationRow({ label, enabled, onToggle, children }: any) {
  return (
    <Card><CardContent className="p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1"><Switch checked={enabled} onCheckedChange={onToggle} /><div className="font-medium">{label}</div></div>
      {children}
    </CardContent></Card>
  );
}

function TemplateEditor({ template, onSaved }: any) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const save = async () => {
    const { error } = await supabase.from("email_templates").update({ subject, body, updated_at: new Date().toISOString() }).eq("id", template.id);
    if (error) return toast.error(error.message);
    toast.success("Template guardado"); onSaved();
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{template.name}</CardTitle>
        <CardDescription>Variáveis: {"{{client_name}}, {{event_date}}, {{package_name}}, {{total_value}}, {{deposit_amount}}"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Assunto</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <div><Label>Corpo</Label><Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <Button onClick={save} size="sm">Guardar</Button>
      </CardContent>
    </Card>
  );
}
