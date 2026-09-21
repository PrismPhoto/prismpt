import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PhotographerConflict = {
  events: { id: string; client_name: string }[];
  unavailable: boolean;
};

export type ConflictMap = Record<string, PhotographerConflict>;

/**
 * Conflitos para uma data específica: fotógrafos já atribuídos a outro evento
 * nesse dia (excluindo o evento actual) e fotógrafos marcados como indisponíveis.
 */
export function usePhotographerConflicts(date?: string, excludeEventId?: string): ConflictMap {
  const { data } = useQuery({
    queryKey: ["photog-conflicts", date ?? "", excludeEventId ?? ""],
    enabled: !!date,
    queryFn: async () => {
      const [eps, unav] = await Promise.all([
        supabase
          .from("event_photographers")
          .select("photographer_id, events!inner(id, client_name, event_date, status)")
          .eq("events.event_date", date!)
          .neq("events.status", "Cancelado"),
        supabase.from("photographer_unavailability").select("photographer_id").eq("date", date!),
      ]);
      const map: ConflictMap = {};
      const bucket = (pid: string) => (map[pid] ??= { events: [], unavailable: false });
      (eps.data ?? []).forEach((r: any) => {
        const ev = r.events;
        if (!r.photographer_id || !ev || ev.id === excludeEventId) return;
        bucket(r.photographer_id).events.push({ id: ev.id, client_name: ev.client_name });
      });
      (unav.data ?? []).forEach((u: any) => {
        if (u.photographer_id) bucket(u.photographer_id).unavailable = true;
      });
      return map;
    },
  });
  return data ?? {};
}

/**
 * A partir de uma lista de eventos já carregada, encontra fotógrafos repetidos
 * na mesma data. Devolve as iniciais em conflito por evento e por data.
 */
export function findDuplicatePhotographers(events: any[]) {
  const byDatePhotog = new Map<string, { eventIds: Set<string>; label: string }>();
  for (const e of events ?? []) {
    if (!e?.event_date || e?.status === "Cancelado") continue;
    for (const ep of e.event_photographers ?? []) {
      if (!ep?.photographer_id) continue;
      const key = `${e.event_date}|${ep.photographer_id}`;
      const entry = byDatePhotog.get(key) ?? {
        eventIds: new Set<string>(),
        label: ep.photographers?.initials ?? ep.photographers?.full_name ?? "?",
      };
      entry.eventIds.add(e.id);
      byDatePhotog.set(key, entry);
    }
  }

  const byEvent: Record<string, string[]> = {};
  const byDate: Record<string, string[]> = {};
  for (const [key, entry] of byDatePhotog) {
    if (entry.eventIds.size < 2) continue;
    const date = key.split("|")[0];
    (byDate[date] ??= []).push(entry.label);
    entry.eventIds.forEach((id) => {
      (byEvent[id] ??= []).push(entry.label);
    });
  }
  return { byEvent, byDate };
}
