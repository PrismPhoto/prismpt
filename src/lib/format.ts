export const EUR = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n ?? 0);

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};

export const EVENT_TYPES = ["Casamento", "Corporate", "Festa", "Baptizado", "Outro"] as const;
export const LEAD_STATUSES = ["Novo", "Proposta Enviada", "Adjudicado", "Arquivo"] as const;
export const EVENT_STATUSES = ["Confirmado", "Aguarda Sinal", "Cancelado"] as const;
export const LEAD_SOURCES = ["email", "website", "instagram", "wedding_planner", "outro"] as const;
