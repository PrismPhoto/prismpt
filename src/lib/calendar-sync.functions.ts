import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
const DEFAULT_CALENDAR_ID = "info@prism.pt";

/** Extrai o nome do cliente do título: remove "//", números iniciais e iniciais de fotógrafos. */
export function parseClientName(title: string): string {
  let t = title.replace(/^\s*\/\/\s*/, "").trim();
  t = t.replace(/^\d+\s*[-–—.:]?\s*/, "");
  t = t.replace(
    /[\s\-–—|(]*\b(?:[A-Z]{2,4}|\+\s*\d+)(?:\s*[/+,]?\s*(?:[A-Z]{2,4}|\+\s*\d+))*\s*\)?\s*$/,
    "",
  );
  t = t.replace(/[\s\-–—|/]+$/, "").trim();
  return t || title.replace(/^\s*\/\/\s*/, "").trim();
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type CalItem = {
  gid: string;
  title: string;
  date: string;
  clientName: string;
  photographers: string[];
  extraCount: number;
  email: string | null;
  venue: string | null;
  packName: string | null;
  packageId: string | null;
  value: number | null;
  deposit: number | null;
  depositDate: string | null;
  depositMethod: string | null;
  depositPaid: boolean;
  description: string | null;
};

export type Change = { field: "date" | "photographers" | "package"; label: string; app: string; cal: string };
export type DiffItem = { eventId: string; clientName: string; linkOnly: boolean; changes: Change[]; cal: CalItem };
export type RemovedItem = { eventId: string; clientName: string; date: string; status: string | null };
export type SyncPreview = { year: number; news: CalItem[]; diffs: DiffItem[]; removed: RemovedItem[]; unchanged: number };

function parseTitle(title: string) {
  const body = title.replace(/^\s*\/\/\s*/, "").trim();
  const idx = body.lastIndexOf(" - ");
  let photographers: string[] = [];
  let extraCount = 0;
  let name = body;
  if (idx > 0) {
    const tail = body.slice(idx + 3);
    const tokens = tail.split(/[+/,&]/).map((t) => t.trim()).filter(Boolean);
    const valid = tokens.length > 0 && tokens.every((t) => /^[A-Z]{2,4}$/.test(t) || /^\d+$/.test(t));
    if (valid) {
      name = body.slice(0, idx).trim();
      for (const t of tokens) {
        if (/^\d+$/.test(t)) extraCount += Number(t);
        else photographers.push(t);
      }
    }
  }
  if (name === body) name = parseClientName(title);
  return { name: name.replace(/^\d+\s*[-–—.:]?\s*/, "").trim() || body, photographers, extraCount };
}

function num(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = s.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  return Number(m[1].replace(",", "."));
}

function stripHtml(s: string) {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function parseDescription(raw: string | null) {
  const out: {
    email: string | null; venue: string | null; packName: string | null; value: number | null;
    deposit: number | null; depositDate: string | null; depositMethod: string | null; depositPaid: boolean; photographers: string[];
  } = { email: null, venue: null, packName: null, value: null, deposit: null, depositDate: null, depositMethod: null, depositPaid: false, photographers: [] };
  if (!raw) return out;
  const text = stripHtml(raw);
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  out.email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null;

  const sync = lines.find((l) => l.includes("[PRISM-SYNC]"));
  if (sync) {
    const parts = sync.replace(/.*\[PRISM-SYNC\]/, "").split("|");
    for (const p of parts) {
      const [k, ...rest] = p.split(":");
      const v = rest.join(":").trim();
      const key = normalize(k ?? "");
      if (!v) continue;
      if (key === "pack") out.packName = v;
      else if (key === "valor") out.value = num(v);
      else if (key === "sinal") { out.deposit = num(v); }
      else if (key === "datasinal") { out.depositDate = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; out.depositPaid = !!out.depositDate; }
      else if (key === "metodo") out.depositMethod = v;
      else if (key === "fotografo" || key === "fotografos") out.photographers = v.split(/[+/,&\s]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z]{2,4}$/.test(x));
      else if (key === "local" || key === "venue") out.venue = v;
      else if (key === "email") out.email = v;
    }
    return out;
  }

  for (const l of lines) {
    const kv = l.match(/^([^:]{2,20}):\s*(.+)$/);
    const key = kv ? normalize(kv[1]) : "";
    const v = kv?.[2]?.trim() ?? "";
    if (!out.venue && (key === "venue" || key === "local" || key === "localizacao")) out.venue = v;
    if (!out.packName && key === "pack") {
      out.packName = v.replace(/[\d.,]+\s*€?.*$/, "").replace(/[-–|]+$/, "").trim() || v;
      const n = num(v.replace(/^[^\d]*/, ""));
      if (n && n > 100) out.value = n;
    }
    if (out.value == null && (key === "valor" || key === "total")) out.value = num(v);
    if (out.deposit == null && key === "sinal") {
      out.deposit = num(v);
      if (/pago/i.test(v)) out.depositPaid = true;
    }
    if (/sinal pago/i.test(l)) {
      out.depositPaid = true;
      if (out.deposit == null) out.deposit = num(l);
    }
    if (!out.photographers.length && (key === "fotografo" || key === "fotografos")) {
      out.photographers = v.split(/[+/,&\s]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z]{2,4}$/.test(x));
    }
  }
  return out;
}

async function assertManager(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "manager").maybeSingle();
  if (!data) throw new Error("Apenas o Admin pode sincronizar o calendário");
}

async function fetchCalendar(year: number, calendarId: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["GOOGLE_CALENDAR_API_KEY"];
  if (!lovableKey || !connKey) throw new Error("NOT_CONNECTED");
  const items: any[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      timeMin: `${year}-01-01T00:00:00Z`,
      timeMax: `${year + 1}-01-01T00:00:00Z`,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${GATEWAY_URL}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connKey },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Google Calendar request failed [${res.status}]: ${body}`);
      if (res.status === 401 || res.status === 403) throw new Error(`NOT_CONNECTED [${res.status}]: ${body}`);
      throw new Error(`Google Calendar [${res.status}]: ${body}`);
    }
    const json: any = await res.json();
    items.push(...(json.items ?? []));
    pageToken = json.nextPageToken;
  } while (pageToken);
  return items;
}

export const getCalendarSyncInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("app_settings").select("gcal_last_sync_at").limit(1).maybeSingle();
    return { lastSync: (data as any)?.gcal_last_sync_at ?? null };
  });

export const previewCalendarSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ year: z.number().int().min(2000).max(2100) }).parse(d))
  .handler(async ({ context, data }): Promise<SyncPreview> => {
    const sb = context.supabase;
    await assertManager(sb, context.userId);
    const { data: settings } = await sb.from("app_settings").select("gcal_calendar_id").limit(1).maybeSingle();
    const calendarId = (settings as any)?.gcal_calendar_id || DEFAULT_CALENDAR_ID;
    const raw = await fetchCalendar(data.year, calendarId);

    const [{ data: pkgs }, { data: photogs }, { data: events, error }] = await Promise.all([
      sb.from("packages").select("id, name, version"),
      sb.from("photographers").select("id, initials"),
      sb.from("events")
        .select("id, client_name, event_date, status, package_id, google_calendar_event_id, packages(name), event_photographers(photographer_id, photographers(initials))")
        .gte("event_date", `${data.year}-01-01`)
        .lte("event_date", `${data.year}-12-31`),
    ]);
    if (error) throw new Error(error.message);
    const yy = String(data.year).slice(2);
    const findPackage = (name: string | null) => {
      if (!name) return null;
      const n = normalize(name);
      const matches = (pkgs ?? []).filter((p: any) => normalize(p.name) === n);
      return (matches.find((p: any) => p.version === yy) ?? matches.find((p: any) => String(p.version).length <= 2) ?? matches[0])?.id ?? null;
    };
    const known = new Set((photogs ?? []).map((p: any) => p.initials));

    const cal: CalItem[] = raw
      .filter((e) => e.status !== "cancelled" && typeof e.summary === "string" && /^\/\/[^\/]/.test(e.summary.trim()))
      .map((e) => {
        const title = (e.summary as string).trim();
        const date = (e.start?.date ?? e.start?.dateTime?.slice(0, 10)) as string;
        const t = parseTitle(title);
        const d = parseDescription(e.description ?? null);
        const ph = Array.from(new Set([...t.photographers, ...d.photographers])).filter((i) => known.has(i));
        return {
          gid: e.id, title, date, clientName: t.name, photographers: ph, extraCount: t.extraCount,
          email: d.email, venue: d.venue ?? (e.location || null), packName: d.packName, packageId: findPackage(d.packName),
          value: d.value, deposit: d.deposit, depositDate: d.depositDate, depositMethod: d.depositMethod,
          depositPaid: d.depositPaid, description: e.description ? stripHtml(e.description).slice(0, 2000) : null,
        };
      })
      .filter((c) => !!c.date && c.date.startsWith(String(data.year)));

    const rows = (events ?? []) as any[];
    const byGid = new Map(rows.filter((r) => r.google_calendar_event_id).map((r) => [r.google_calendar_event_id, r]));
    const used = new Set<string>();
    const news: CalItem[] = [];
    const diffs: DiffItem[] = [];
    let unchanged = 0;

    const compare = (row: any, c: CalItem): Change[] => {
      const ch: Change[] = [];
      if (row.event_date !== c.date) ch.push({ field: "date", label: "Data", app: row.event_date, cal: c.date });
      const appPh = (row.event_photographers ?? []).map((x: any) => x.photographers?.initials).filter(Boolean).sort();
      const missing = c.photographers.filter((i) => !appPh.includes(i));
      if (c.photographers.length && missing.length) ch.push({ field: "photographers", label: "Fotógrafos", app: appPh.join(" + ") || "—", cal: c.photographers.join(" + ") });
      if (c.packageId && c.packageId !== row.package_id) ch.push({ field: "package", label: "Pack", app: row.packages?.name ?? "—", cal: c.packName ?? "" });
      return ch;
    };

    for (const c of cal) {
      let row = byGid.get(c.gid);
      let linkOnly = false;
      if (!row) {
        const key = normalize(c.clientName);
        row = rows.find((r) => {
          if (r.google_calendar_event_id || used.has(r.id) || r.event_date !== c.date) return false;
          const rk = normalize(r.client_name ?? "");
          return !!key && !!rk && (rk === key || rk.includes(key) || key.includes(rk));
        });
        linkOnly = !!row;
      }
      if (!row) { news.push(c); continue; }
      used.add(row.id);
      const changes = compare(row, c);
      if (changes.length || linkOnly) diffs.push({ eventId: row.id, clientName: row.client_name ?? c.clientName, linkOnly, changes, cal: c });
      else unchanged++;
    }

    const calGids = new Set(cal.map((c) => c.gid));
    const removed: RemovedItem[] = rows
      .filter((r) => r.google_calendar_event_id && !calGids.has(r.google_calendar_event_id))
      .map((r) => ({ eventId: r.id, clientName: r.client_name ?? "", date: r.event_date, status: r.status }));

    const { data: st } = await sb.from("app_settings").select("id").limit(1).maybeSingle();
    if (st) await sb.from("app_settings").update({ gcal_last_sync_at: new Date().toISOString() } as any).eq("id", (st as any).id);

    return { year: data.year, news, diffs, removed, unchanged };
  });

const calItemSchema = z.object({
  gid: z.string(), title: z.string(), date: z.string(), clientName: z.string(),
  photographers: z.array(z.string()), extraCount: z.number(),
  email: z.string().nullable(), venue: z.string().nullable(), packName: z.string().nullable(), packageId: z.string().nullable(),
  value: z.number().nullable(), deposit: z.number().nullable(), depositDate: z.string().nullable(), depositMethod: z.string().nullable(),
  depositPaid: z.boolean(), description: z.string().nullable(),
});

export const applyCalendarSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      creates: z.array(calItemSchema),
      updates: z.array(z.object({ eventId: z.string().uuid(), cal: calItemSchema, fields: z.array(z.enum(["date", "photographers", "package"])) })),
      cancels: z.array(z.string().uuid()),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    await assertManager(sb, context.userId);
    const { data: photogs } = await sb.from("photographers").select("id, initials");
    const idOf = (i: string) => (photogs ?? []).find((p: any) => p.initials === i)?.id as string | undefined;
    const errors: string[] = [];
    let created = 0, updated = 0, cancelled = 0;

    for (const c of data.creates) {
      const { data: ins, error } = await sb.from("events").insert({
        event_date: c.date, client_name: c.clientName, event_type: "Casamento" as any, status: "Confirmado" as any,
        email: c.email, location: c.venue, package_id: c.packageId, total_value: c.value ?? 0,
        deposit_amount: c.deposit, deposit_paid: c.depositPaid || !!c.depositDate, deposit_paid_date: c.depositDate,
        deposit_method: c.depositMethod, event_notes: c.title, internal_notes: c.description, google_calendar_event_id: c.gid,
      } as any).select("id").single();
      if (error) { errors.push(`${c.clientName}: ${error.message}`); continue; }
      const ids = c.photographers.map(idOf).filter(Boolean) as string[];
      if (ids.length) {
        const { error: e2 } = await sb.from("event_photographers").insert(ids.map((pid, i) => ({ event_id: ins.id, photographer_id: pid, position: i + 1 })) as any);
        if (e2) errors.push(`${c.clientName} (fotógrafos): ${e2.message}`);
      }
      created++;
    }

    for (const u of data.updates) {
      const patch: any = { google_calendar_event_id: u.cal.gid };
      if (u.fields.includes("date")) patch.event_date = u.cal.date;
      if (u.fields.includes("package") && u.cal.packageId) patch.package_id = u.cal.packageId;
      const { error } = await sb.from("events").update(patch).eq("id", u.eventId);
      if (error) { errors.push(`${u.cal.clientName}: ${error.message}`); continue; }
      if (u.fields.includes("photographers")) {
        const { data: cur } = await sb.from("event_photographers").select("photographer_id, position").eq("event_id", u.eventId);
        const have = new Set((cur ?? []).map((r: any) => r.photographer_id));
        let pos = Math.max(0, ...(cur ?? []).map((r: any) => r.position ?? 0));
        const add = u.cal.photographers.map(idOf).filter((id): id is string => !!id && !have.has(id));
        if (add.length) {
          const { error: e2 } = await sb.from("event_photographers").insert(add.map((pid) => ({ event_id: u.eventId, photographer_id: pid, position: ++pos })) as any);
          if (e2) errors.push(`${u.cal.clientName} (fotógrafos): ${e2.message}`);
        }
      }
      updated++;
    }

    for (const id of data.cancels) {
      const { error } = await sb.from("events").update({ status: "Cancelado" as any }).eq("id", id);
      if (error) errors.push(error.message); else cancelled++;
    }

    const { data: s } = await sb.from("app_settings").select("id").limit(1).maybeSingle();
    if (s) await sb.from("app_settings").update({ gcal_last_sync_at: new Date().toISOString() } as any).eq("id", (s as any).id);

    return { created, updated, cancelled, errors };
  });
