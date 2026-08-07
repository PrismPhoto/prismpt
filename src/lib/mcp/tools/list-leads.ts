import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "Listar leads",
  description: "Lista os pedidos/leads recebidos, com estado, data do evento e origem. Pode filtrar por estado e ano.",
  inputSchema: {
    status: z.string().optional().describe("Estado da lead, ex. Novo, Proposta, Adjudicado, Perdido."),
    year: z.number().int().optional().describe("Ano do evento."),
    limit: z.number().int().optional().describe("Máximo de leads (por omissão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, year, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("leads")
      .select("id, client_name, email, event_date, event_type, status, source, location, pax, converted_to_event_id")
      .order("date_received", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (status) query = query.eq("status", status as never);
    if (year) query = query.eq("event_year", year);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, leads: data ?? [] });
  },
});
