import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lovableKey || !driveKey) throw new Error("A ligação ao Google Drive não está configurada.");
  return { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": driveKey };
}

async function driveFetch(path: string, init?: RequestInit & { rawHeaders?: Record<string, string> }) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.rawHeaders ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Google Drive request failed [${res.status}]: ${body}`);
    throw new Error(`Google Drive respondeu com erro [${res.status}]: ${body}`);
  }
  return res;
}

async function assertManager(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "manager").maybeSingle();
  if (!data) throw new Error("Apenas o Admin pode fazer isto");
}

const FIELDS = "files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink,parents),nextPageToken";

export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  webViewLink: string | null;
  isFolder: boolean;
};

export const listDriveItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    folderId: z.string().max(200).optional(),
    search: z.string().max(200).optional(),
  }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const parent = data.folderId?.trim() || "root";
    const clauses = ["trashed = false"];
    if (data.search?.trim()) {
      clauses.push(`name contains '${data.search.trim().replace(/'/g, "\\'")}'`);
    } else {
      clauses.push(`'${parent}' in parents`);
    }
    const params = new URLSearchParams({
      q: clauses.join(" and "),
      fields: FIELDS,
      pageSize: "200",
      orderBy: "folder,name",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    const res = await driveFetch(`/drive/v3/files?${params.toString()}`);
    const json: any = await res.json();
    const files: DriveItem[] = (json.files ?? []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? Number(f.size) : null,
      modifiedTime: f.modifiedTime ?? null,
      webViewLink: f.webViewLink ?? null,
      isFolder: f.mimeType === "application/vnd.google-apps.folder",
    }));

    let breadcrumb: { id: string; name: string }[] = [];
    if (!data.search?.trim() && parent !== "root") {
      let cur: string | null = parent;
      for (let i = 0; i < 10 && cur && cur !== "root"; i++) {
        const r = await driveFetch(`/drive/v3/files/${cur}?fields=id,name,parents&supportsAllDrives=true`);
        const meta: any = await r.json();
        breadcrumb.unshift({ id: meta.id, name: meta.name });
        cur = meta.parents?.[0] ?? null;
      }
    }
    return { files, breadcrumb };
  });

export const createDriveFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    name: z.string().min(1).max(200),
    parentId: z.string().max(200).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    const res = await driveFetch(`/drive/v3/files?supportsAllDrives=true&fields=id,name`, {
      method: "POST",
      rawHeaders: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [data.parentId?.trim() || "root"],
      }),
    });
    return (await res.json()) as { id: string; name: string };
  });

export const uploadDriveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    name: z.string().min(1).max(255),
    mimeType: z.string().max(200).optional(),
    contentBase64: z.string().min(1),
    parentId: z.string().max(200).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    const mime = data.mimeType || "application/octet-stream";
    const boundary = `prism${Math.random().toString(36).slice(2)}`;
    const metadata = JSON.stringify({ name: data.name, parents: [data.parentId?.trim() || "root"] });
    const bytes = Uint8Array.from(atob(data.contentBase64), (c) => c.charCodeAt(0));
    const enc = new TextEncoder();
    const head = enc.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
    );
    const tail = enc.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(head.length + bytes.length + tail.length);
    body.set(head, 0);
    body.set(bytes, head.length);
    body.set(tail, head.length + bytes.length);

    const res = await driveFetch(`/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name`, {
      method: "POST",
      rawHeaders: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    return (await res.json()) as { id: string; name: string };
  });

export const deleteDriveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    await driveFetch(`/drive/v3/files/${data.id}?supportsAllDrives=true`, { method: "DELETE" });
    return { ok: true };
  });

export const downloadDriveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const meta: any = await (await driveFetch(`/drive/v3/files/${data.id}?fields=id,name,mimeType&supportsAllDrives=true`)).json();
    const isGoogleDoc = String(meta.mimeType).startsWith("application/vnd.google-apps");
    const path = isGoogleDoc
      ? `/drive/v3/files/${data.id}/export?mimeType=application/pdf`
      : `/drive/v3/files/${data.id}?alt=media&supportsAllDrives=true`;
    const res = await driveFetch(path);
    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i += 8192) binary += String.fromCharCode(...buf.subarray(i, i + 8192));
    return {
      name: isGoogleDoc ? `${meta.name}.pdf` : meta.name,
      mimeType: isGoogleDoc ? "application/pdf" : meta.mimeType,
      base64: btoa(binary),
    };
  });
