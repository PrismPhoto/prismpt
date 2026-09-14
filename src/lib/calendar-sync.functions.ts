import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
const CALENDAR_ID = "info@prism.pt";

export type SyncResult = {
  imported: number;
  skipped: number;
  names: string[];
};

/** Extrai o nome do cliente do título: remove "//", números iniciais e iniciais de fotógrafos. */
export function parseClientName(title: string): string {
  let t = title.replace(/^\s*\/\/\s*/, "").trim();
  // remover número inicial (ex.: "12 - Ana & João" ou "12 Ana & João")
  t = t.replace(/^\d+\s*[-–—.:]?\s*/, "");
  // remover iniciais de fotógrafos no fim (tokens maiúsculos 2-4 letras, separados por / ou espaço)
  t = t.replace(/[\s\-–—|(]*\b(?:[A-Z]{2,4})(?:\s*[/+,]\s*[A-Z]{2,4})*\s*\)?\s*$/, "");
  // remover separadores residuais
  t = t.replace(/[\s\-–—|/]+$/, "").trim();
  return t || title.replace(/^\s*\/\/\s*/, "").trim();
}

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export const syncGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SyncResult> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connKey = process.env["GOOGLE_CALENDAR_API_KEY"];
    if (!lovableKey || !connKey) {
      throw new Error("NOT_CONNECTED");
    }

    const timeMin = new Date();
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 18);

    const items: any[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const res = await fetch(
        `${GATEWAY_URL}/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`,
        {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": connKey,
          },
        },
      );
      if (!res.ok) {
        const body = await res.text();
        console.error(`Google Calendar request failed [${res.status}]: ${body}`);
        if (res.status === 401 || res.status === 403) throw new Error("NOT_CONNECTED");
        throw new Error(`Google Calendar [${res.status}]: ${body}`);
      }
      const json: any = await res.json();
      items.push(...(json.items ?? []));
      pageToken = json.nextPageToken;
    } while (pageToken);

    const candidates = items
      .filter((e) => typeof e.summary === "string" && e.summary.trim().startsWith("//"))
      .map((e) => ({
        gid: e.id as string,
        title: (e.summary as string).trim(),
        notes: (e.description as string | undefined) ?? null,
        date: (e.start?.date ?? e.start?.dateTime?.slice(0, 10)) as string | undefined,
      }))
      .filter((e) => !!e.date);

    const { data: existing, error: readErr } = await context.supabase
      .from("events")
      .select("id, event_date, client_name, google_calendar_event_id")
      .gte("event_date", timeMin.toISOString().slice(0, 10))
      .lte("event_date", timeMax.toISOString().slice(0, 10));
    if (readErr) throw new Error(readErr.message);

    const existingRows = existing ?? [];
    const imported: string[] = [];
    let skipped = 0;

    for (const c of candidates) {
      const clientName = parseClientName(c.title);
      const key = normalize(clientName);
      const dup = existingRows.some((row: any) => {
        if (row.google_calendar_event_id && row.google_calendar_event_id === c.gid) return true;
        if (row.event_date !== c.date) return false;
        const rk = normalize(row.client_name ?? "");
        return !!key && !!rk && (rk === key || rk.includes(key) || key.includes(rk));
      });
      if (dup) {
        skipped++;
        continue;
      }

      const { data: inserted, error } = await context.supabase
        .from("events")
        .insert({
          event_date: c.date!,
          event_year: Number(c.date!.slice(0, 4)),
          client_name: clientName,
          event_type: "Casamento" as any,
          status: "Confirmado" as any,
          event_notes: c.title,
          internal_notes: c.notes,
          google_calendar_event_id: c.gid,
          total_value: 0,
        })
        .select("id, event_date, client_name")
        .single();
      if (error) {
        console.error(`Insert falhou para "${clientName}": ${error.message}`);
        continue;
      }
      existingRows.push({ ...inserted, google_calendar_event_id: c.gid } as any);
      imported.push(clientName);
    }

    return { imported: imported.length, skipped, names: imported };
  });
