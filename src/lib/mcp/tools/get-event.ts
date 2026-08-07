import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_event",
  title: "Detalhe do evento",
  description:
    "Devolve todos os detalhes de um evento (dados do casamento, logística, pagamentos), os fotógrafos atribuídos e os extras.",
  inputSchema: { event_id: z.string().describe("ID do evento.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ event_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data: event, error } = await supabase.from("events").select("*").eq("id", event_id).maybeSingle();
    if (error) return errorResult(error.message);
    if (!event) return errorResult("Evento não encontrado.");
    const { data: photogs } = await supabase
      .from("event_photographers")
      .select("position, role, fee, prism_commission, external_name, deposit_paid, final_payment_received, photographers(initials, full_name)")
      .eq("event_id", event_id)
      .order("position");
    const { data: extras } = await supabase.from("event_extras").select("*").eq("event_id", event_id);
    return jsonResult({ event, photographers: photogs ?? [], extras: extras ?? [] });
  },
});
