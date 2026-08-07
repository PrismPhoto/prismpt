import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "create_lead",
  title: "Criar lead",
  description: "Cria uma nova lead (pedido de orçamento) na PRISM com os dados do cliente e do evento.",
  inputSchema: {
    client_name: z.string().describe("Nome do cliente ou casal."),
    email: z.string().optional().describe("Email de contacto."),
    event_date: z.string().optional().describe("Data do evento em formato YYYY-MM-DD."),
    location: z.string().optional().describe("Local do evento."),
    pax: z.number().int().optional().describe("Número de convidados."),
    notes: z.string().optional().describe("Notas sobre o pedido."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ client_name, email, event_date, location, pax, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("leads")
      .insert({
        client_name,
        email: email ?? null,
        event_date: event_date ?? null,
        event_year: event_date ? Number(event_date.slice(0, 4)) : null,
        location: location ?? null,
        pax: pax ?? null,
        notes: notes ?? null,
      })
      .select()
      .maybeSingle();
    if (error) return errorResult(error.message);
    return jsonResult({ lead: data });
  },
});
