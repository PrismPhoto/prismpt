import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EUR, fmtDate } from "@/lib/format";
import {
  applyCalendarSync, getCalendarSyncInfo, previewCalendarSync,
  type SyncPreview,
} from "@/lib/calendar-sync.functions";

export function CalendarSyncButton({ year }: { year: number }) {
  const qc = useQueryClient();
  const runPreview = useServerFn(previewCalendarSync);
  const runApply = useServerFn(applyCalendarSync);
  const getInfo = useServerFn(getCalendarSyncInfo);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastCount, setLastCount] = useState<number | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());

  useEffect(() => { getInfo().then((r) => setLastSync(r.lastSync)).catch(() => {}); }, [getInfo]);

  const allKeys = useMemo(() => {
    if (!preview) return [] as string[];
    return [
      ...preview.news.map((n) => `n:${n.gid}`),
      ...preview.diffs.map((d) => `d:${d.eventId}`),
      ...preview.removed.map((r) => `r:${r.eventId}`),
    ];
  }, [preview]);
  const diffCount = allKeys.length;

  const start = async () => {
    setLoading(true);
    try {
      const res = await runPreview({ data: { year } });
      setPreview(res);
      setLastCount(res.news.length + res.diffs.length + res.removed.length);
      // removidos ficam desmarcados por defeito (nunca cancelar sem decisão explícita)
      setSel(new Set([...res.news.map((n) => `n:${n.gid}`), ...res.diffs.map((d) => `d:${d.eventId}`)]));
      setLastSync(new Date().toISOString());
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (msg.includes("NOT_CONNECTED")) toast.error("Sem acesso ao Google Calendar. Verifica a ligação nas Definições.");
      else toast.error(`Falha ao ler o calendário: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const apply = async (keys: Set<string>) => {
    if (!preview) return;
    setApplying(true);
    try {
      const res = await runApply({
        data: {
          creates: preview.news.filter((n) => keys.has(`n:${n.gid}`)),
          updates: preview.diffs.filter((d) => keys.has(`d:${d.eventId}`)).map((d) => ({
            eventId: d.eventId, cal: d.cal, fields: d.changes.map((c) => c.field),
          })),
          cancels: preview.removed.filter((r) => keys.has(`r:${r.eventId}`)).map((r) => r.eventId),
        },
      });
      toast.success(`${res.created} criados · ${res.updated} actualizados · ${res.cancelled} cancelados`);
      if (res.errors.length) toast.error(`Erros: ${res.errors.slice(0, 3).join("; ")}`);
      qc.invalidateQueries({ queryKey: ["events"] });
      setPreview(null);
    } catch (err: any) {
      toast.error(`Falha ao aplicar: ${String(err?.message ?? err)}`);
    } finally {
      setApplying(false);
    }
  };

  const toggle = (k: string) => setSel((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={start} disabled={loading} title={lastSync ? `Última sincronização: ${new Date(lastSync).toLocaleString("pt-PT")}` : "Nunca sincronizado"}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {loading ? "A ler…" : "Sync"}
          {lastCount != null && <Badge variant={lastCount ? "default" : "secondary"} className="ml-2">{lastCount}</Badge>}
        </Button>
        <span className="text-xs text-muted-foreground hidden lg:inline">
          {lastSync ? `Última: ${new Date(lastSync).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}` : "Nunca sincronizado"}
        </span>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && !applying && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Revisão do Sync — {preview?.year}
              <Badge variant={diffCount ? "default" : "secondary"}>{diffCount} novos</Badge>
            </DialogTitle>
            <DialogDescription>
              Só aparecem casamentos "//" que ainda não estão na plataforma. {preview?.unchanged ?? 0} já existem e foram ignorados. Nada é criado até clicares em aplicar.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-6">
              <section>
                <h3 className="font-medium mb-2">Novos ({preview.news.length})</h3>
                {preview.news.length === 0 && <p className="text-sm text-muted-foreground">Nenhum.</p>}
                <ul className="space-y-2">
                  {preview.news.map((n) => (
                    <li key={n.gid} className="flex gap-3 rounded-md border p-3 text-sm">
                      <Checkbox checked={sel.has(`n:${n.gid}`)} onCheckedChange={() => toggle(`n:${n.gid}`)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{n.clientName} <span className="text-muted-foreground font-normal">· {fmtDate(n.date)}</span></div>
                        <div className="text-muted-foreground text-xs mt-1 flex flex-wrap gap-x-3">
                          <span>Fotógrafos: {n.photographers.join(" + ") || "—"}{n.extraCount ? ` + ${n.extraCount}` : ""}</span>
                          {n.packName && <span>Pack: {n.packName}{!n.packageId && " (não reconhecido)"}</span>}
                          {n.value != null && <span>Valor: {EUR(n.value)}</span>}
                          {n.deposit != null && <span>Sinal: {EUR(n.deposit)}{n.depositPaid || n.depositDate ? " (pago)" : ""}</span>}
                          {n.venue && <span>Local: {n.venue}</span>}
                          {n.email && <span>{n.email}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPreview(null)} disabled={applying}>Cancelar</Button>
            <Button variant="outline" onClick={() => apply(sel)} disabled={applying || sel.size === 0}>
              Aplicar seleccionados ({sel.size})
            </Button>
            <Button onClick={() => apply(new Set(allKeys))} disabled={applying || diffCount === 0}>
              {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Aplicar todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
