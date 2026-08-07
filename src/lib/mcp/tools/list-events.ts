import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_events",
  title: "Listar eventos",
  description:
    "Lista os eventos (casamentos) visíveis para o utilizador, com data, cliente, estado de pagamento e valor. Pode filtrar por ano e por texto do cliente.",
  inputSchema: {
    year: z.number().int().optional().describe("Ano do evento, ex. 2027."),
    search: z.string().optional().describe("Texto a procurar no nome do cliente."),
    limit: z.number().int().optional().describe("Máximo de eventos a devolver (por omissão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("events")
      .select(
        "id, client_name, couple_names, event_date, event_type, status, location, pax, total_value, deposit_paid, deposit_amount, final_payment_value",
      )
      .order("event_date", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (year) query = query.eq("event_year", year);
    if (search) query = query.ilike("client_name", `%${search}%`);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, events: data ?? [] });
  },
});
