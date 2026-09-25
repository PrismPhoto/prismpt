export const DELIVERY_LABELS: Record<string, string> = {
  pending: "Pendente",
  editing: "Em edição",
  delivered: "Entregue",
};

export function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export function isLate(e: { delivery_status?: string | null; delivery_deadline?: string | null }) {
  const d = daysUntil(e.delivery_deadline);
  return e.delivery_status !== "delivered" && d !== null && d < 0;
}

/** effective status used for list badge/filter */
export function deliveryKey(e: any): "delivered" | "editing" | "pending" | "late" {
  if (e.delivery_status === "delivered") return "delivered";
  if (isLate(e)) return "late";
  return e.delivery_status === "editing" ? "editing" : "pending";
}

export const DELIVERY_BADGE: Record<string, { label: string; cls: string }> = {
  delivered: { label: "🟢 Entregue", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  editing: { label: "🟡 Em edição", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  pending: { label: "⚪ Pendente", cls: "bg-muted text-muted-foreground" },
  late: { label: "🔴 Atrasado", cls: "bg-destructive/15 text-destructive" },
};

export function countdownClass(days: number | null) {
  if (days === null) return "bg-muted text-muted-foreground";
  if (days < 0) return "bg-red-900 text-red-50";
  if (days < 15) return "bg-destructive/15 text-destructive";
  if (days <= 30) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
}
