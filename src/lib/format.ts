export const EUR = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n ?? 0);

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};

// --- Pacotes -------------------------------------------------------------
// version 27 = tabela base; 2710 = +10%; 2715 = +15%; 2720 = +20%; etc.
export const PACKAGE_BASE_VERSION = 27;

export const packageSuffix = (version: number | null | undefined) => {
  const v = Number(version);
  if (!Number.isFinite(v) || v <= PACKAGE_BASE_VERSION) return "";
  const pct = v % 100;
  return pct > 0 ? ` +${pct}%` : "";
};

export const packageLabel = (name?: string | null, version?: number | null) =>
  `${name ?? "—"}${packageSuffix(version)}`;

export const packageLabelWithPrice = (
  name?: string | null,
  version?: number | null,
  price?: number | null,
) => `${packageLabel(name, version)} — ${EUR(price)}`;

export const sortPackages = <T extends { name?: string | null; version?: number | null }>(list: T[]) =>
  [...list].sort(
    (a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt-PT") ||
      (Number(a.version) || 0) - (Number(b.version) || 0),
  );

export const EVENT_TYPES = ["Casamento", "Corporate", "Festa", "Baptizado", "Outro"] as const;
export const LEAD_STATUSES = ["Novo", "Proposta Enviada", "Adjudicado", "Arquivo"] as const;
export const EVENT_STATUSES = ["Confirmado", "Aguarda Sinal", "Cancelado"] as const;
export const LEAD_SOURCES = ["email", "website", "instagram", "wedding_planner", "outro"] as const;
