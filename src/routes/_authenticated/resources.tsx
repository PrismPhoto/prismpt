import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Folder, FolderPlus, Upload, Download, ExternalLink, Trash2, RefreshCw, Search,
  FileImage, FileText, FileArchive, FileSpreadsheet, File as FileIcon, ChevronRight, Home, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  listDriveItems, createDriveFolder, uploadDriveFile, deleteDriveItem, downloadDriveFile,
} from "@/lib/google-drive.functions";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({
    meta: [
      { title: "Recursos PRISM" },
      { name: "description", content: "Pastas e ficheiros partilhados da equipa PRISM no Google Drive." },
      { property: "og:title", content: "Recursos PRISM" },
      { property: "og:description", content: "Pastas e ficheiros partilhados da equipa PRISM no Google Drive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResourcesPage,
});

function iconFor(mime: string, isFolder: boolean) {
  if (isFolder) return Folder;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("compressed")) return FileArchive;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) return FileSpreadsheet;
  if (mime.includes("pdf") || mime.includes("document") || mime.startsWith("text/")) return FileText;
  return FileIcon;
}

function humanSize(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function humanDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ResourcesPage() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const isAdmin = role === "manager";

  const [folderId, setFolderId] = useState<string>("root");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const list = useServerFn(listDriveItems);
  const mkFolder = useServerFn(createDriveFolder);
  const upload = useServerFn(uploadDriveFile);
  const remove = useServerFn(deleteDriveItem);
  const download = useServerFn(downloadDriveFile);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["drive", folderId, term],
    queryFn: () => list({ data: { folderId, search: term || undefined } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["drive"] });
  const files = data?.files ?? [];
  const crumbs = data?.breadcrumb ?? [];

  const handleCreateFolder = async () => {
    const name = (newFolder ?? "").trim();
    if (!name) return;
    setBusy(true);
    try {
      await mkFolder({ data: { name, parentId: folderId } });
      toast.success("Pasta criada");
      setNewFolder(null);
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Não foi possível criar a pasta"); }
    setBusy(false);
  };

  const handleUpload = async (fl: FileList | null) => {
    if (!fl?.length) return;
    setBusy(true);
    for (const f of Array.from(fl)) {
      try {
        const buf = new Uint8Array(await f.arrayBuffer());
        let binary = "";
        for (let i = 0; i < buf.length; i += 8192) binary += String.fromCharCode(...buf.subarray(i, i + 8192));
        await upload({ data: { name: f.name, mimeType: f.type || "application/octet-stream", contentBase64: btoa(binary), parentId: folderId } });
        toast.success(`${f.name} carregado`);
      } catch (e: any) { toast.error(`${f.name}: ${e.message ?? "falhou"}`); }
    }
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
    refresh();
  };

  const handleDownload = async (id: string) => {
    setBusy(true);
    try {
      const r = await download({ data: { id } });
      const bin = atob(r.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: r.mimeType }));
      const a = document.createElement("a");
      a.href = url; a.download = r.name; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { toast.error(e.message ?? "Não foi possível descarregar"); }
    setBusy(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}" do Drive?`)) return;
    setBusy(true);
    try {
      await remove({ data: { id } });
      toast.success("Removido");
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Não foi possível remover"); }
    setBusy(false);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Recursos PRISM"
        description="Pastas e ficheiros partilhados da equipa"
        actions={
          isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setNewFolder("")} disabled={busy}>
                <FolderPlus className="h-4 w-4 mr-2" />Nova pasta
              </Button>
              <Button onClick={() => fileInput.current?.click()} disabled={busy}>
                <Upload className="h-4 w-4 mr-2" />Carregar
              </Button>
              <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
            </div>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <button className="flex items-center gap-1 hover:text-foreground" onClick={() => { setFolderId("root"); setTerm(""); setSearch(""); }}>
            <Home className="h-4 w-4" />Drive
          </button>
          {crumbs.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              <button className="hover:text-foreground" onClick={() => { setFolderId(c.id); setTerm(""); setSearch(""); }}>{c.name}</button>
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 w-56" placeholder="Procurar no Drive" value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setTerm(search.trim()); }}
            />
          </div>
          <Button variant="outline" size="icon" onClick={refresh} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {term && <p className="text-sm text-muted-foreground">Resultados para "{term}" — <button className="underline" onClick={() => { setTerm(""); setSearch(""); }}>limpar</button></p>}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />A carregar…
            </div>
          ) : isError ? (
            <div className="p-6 text-sm text-destructive">Não foi possível ligar ao Google Drive. {(error as any)?.message}</div>
          ) : !files.length ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Folder className="h-10 w-10" />
              <p className="text-sm">{term ? "Sem resultados." : "Esta pasta está vazia."}</p>
              {isAdmin && !term && (
                <Button variant="outline" onClick={() => fileInput.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />Carregar o primeiro ficheiro
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {files.map((f) => {
                const Icon = iconFor(f.mimeType, f.isFolder);
                return (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 group">
                    <Icon className={`h-5 w-5 shrink-0 ${f.isFolder ? "text-primary" : "text-muted-foreground"}`} />
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => { if (f.isFolder) { setFolderId(f.id); setTerm(""); setSearch(""); } else if (f.webViewLink) window.open(f.webViewLink, "_blank", "noopener"); }}
                    >
                      <div className="truncate text-sm font-medium">{f.name}</div>
                    </button>
                    <div className="hidden sm:block w-24 text-right text-xs text-muted-foreground">{f.isFolder ? "—" : humanSize(f.size)}</div>
                    <div className="hidden sm:block w-28 text-right text-xs text-muted-foreground">{humanDate(f.modifiedTime)}</div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {f.webViewLink && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => window.open(f.webViewLink!, "_blank", "noopener")}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      {!f.isFolder && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy} onClick={() => handleDownload(f.id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy} onClick={() => handleDelete(f.id, f.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={newFolder !== null} onOpenChange={(o) => !o && setNewFolder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova pasta</DialogTitle></DialogHeader>
          <div>
            <Label>Nome</Label>
            <Input value={newFolder ?? ""} onChange={(e) => setNewFolder(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }} />
          </div>
          <DialogFooter><Button onClick={handleCreateFolder} disabled={busy}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
