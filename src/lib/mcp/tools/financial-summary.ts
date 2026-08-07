import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "financial_summary",
  title: "Resumo financeiro",
  description:
    "Resumo financeiro de um ano: receita total dos eventos, sinais recebidos, valor pendente, fees dos fotógrafos e comissões PRISM.",
  inputSchema: { year: z.number().int().describe("Ano a analisar, ex. 2027.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data: events, error } = await supabase
      .from("events")
      .select("id, client_name, event_date, total_value, deposit_amount, deposit_paid, final_payment_value, final_payment_method")
      .eq("event_year", year);
    if (error) return errorResult(error.message);
    const ids = (events ?? []).map((e) => e.id);
    const { data: eps } = ids.length
      ? await supabase
          .from("event_photographers")
          .select("event_id, fee, prism_commission, final_payment_received, deposit_paid, deposit_amount, final_payment_value")
          .in("event_id", ids)
      : { data: [] as never[] };

    const revenue = (events ?? []).reduce((s, e) => s + Number(e.total_value ?? 0), 0);
    const received = (events ?? []).reduce(
      (s, e) => s + (e.deposit_paid ? Number(e.deposit_amount ?? 0) : 0) + Number(e.final_payment_value ?? 0),
      0,
    );
    const fees = (eps ?? []).reduce((s, p) => s + Number(p.fee ?? 0), 0);
    const feesPaid = (eps ?? []).reduce(
      (s, p) =>
        s +
        (p.final_payment_received ? Number(p.final_payment_value ?? 0) : 0) +
        (p.deposit_paid ? Number(p.deposit_amount ?? 0) : 0),
      0,
    );
    const commissions = (eps ?? []).reduce((s, p) => s + Number(p.prism_commission ?? 0), 0);

    return jsonResult({
      year,
      events: events?.length ?? 0,
      revenue,
      received,
      pending: revenue - received,
      photographer_fees: fees,
      photographer_fees_paid: feesPaid,
      photographer_fees_outstanding: fees - feesPaid,
      prism_commissions: commissions,
    });
  },
});
