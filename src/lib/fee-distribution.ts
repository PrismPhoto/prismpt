export type SlotDistribution = { mode: "percent" | "fixed"; value: number };

export function defaultDistribution(numPrism: number, hasExternal: boolean): SlotDistribution[] {
  const n = Math.max(1, Number(numPrism) || 1);
  const pct = Math.floor((100 / n) * 100) / 100;
  const slots: SlotDistribution[] = Array.from({ length: n }, (_, i) => ({
    mode: "percent",
    value: i === n - 1 ? Math.round((100 - pct * (n - 1)) * 100) / 100 : pct,
  }));
  if (hasExternal) slots.push({ mode: "fixed", value: 450 });
  return slots;
}

export function resizeDistribution(
  current: SlotDistribution[] | null | undefined,
  numPrism: number,
  hasExternal: boolean,
): SlotDistribution[] {
  const cur = Array.isArray(current) ? current : [];
  const n = Math.max(1, Number(numPrism) || 1);
  const def = defaultDistribution(n, hasExternal);
  // Preserve existing Prism slots where possible
  for (let i = 0; i < n; i++) {
    if (cur[i] && cur[i].mode !== "fixed") def[i] = cur[i];
  }
  // Preserve external slot if present in both
  if (hasExternal) {
    const prevExternal = cur.length > 0 ? cur[cur.length - 1] : null;
    if (prevExternal && prevExternal.mode === "fixed") def[n] = prevExternal;
  }
  return def;
}

/**
 * Compute fee for a slot given total value, the package distribution and the prism commission.
 * - "fixed" slots return their fixed value (no commission applied — external photographer).
 * - "percent" slots split (totalValue - sum of fixed values) by their pct, then subtract prismCommission.
 */
export function computeSlotFee(
  distribution: SlotDistribution[],
  idx: number,
  totalValue: number,
  prismCommission: number,
  fixedOverrides?: Record<number, number>,
): number {
  const slot = distribution[idx];
  if (!slot) return 0;
  const fixedVal = (i: number) => {
    const ov = fixedOverrides?.[i];
    return ov !== undefined && ov !== null ? Number(ov) || 0 : Number(distribution[i].value) || 0;
  };
  if (slot.mode === "fixed") return Math.round(fixedVal(idx));
  const fixedSum = distribution.reduce(
    (s, x, i) => (x.mode === "fixed" ? s + fixedVal(i) : s),
    0,
  );
  const pool = Math.max(0, Number(totalValue || 0) - fixedSum);
  const pct = (Number(slot.value) || 0) / 100;
  return Math.round(pool * pct - Number(prismCommission || 0));
}

export function slotLabel(slot: SlotDistribution): string {
  return slot.mode === "fixed" ? `€${slot.value} fixo` : `${slot.value}%`;
}
