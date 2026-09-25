// Resultado líquido do fotógrafo por evento.
export function isPrismDeposit(method: any) {
  const s = String(method ?? "").toLowerCase();
  return s.includes("revolut") || s.includes("cyclik");
}

export function netBreakdown(e: {
  total_value?: any; deposit_amount?: any; deposit_method?: any;
  second_photographer_cost?: any; editor_cost?: any; editor_id?: any; second_photographer_id?: any;
  commission?: number;
}) {
  const gross = Number(e.total_value || 0);
  const commission = Number(e.commission || 0);
  const second = e.second_photographer_id ? Number(e.second_photographer_cost || 0) : 0;
  const editor = e.editor_id ? Number(e.editor_cost || 0) : 0;
  const prismDeposit = isPrismDeposit(e.deposit_method) ? Number(e.deposit_amount || 0) : 0;
  return { gross, commission, second, editor, prismDeposit, net: gross - commission - second - editor - prismDeposit };
}
