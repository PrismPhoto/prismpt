import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_photographers",
  title: "Listar fotógrafos",
  description: "Lista os fotógrafos da PRISM com iniciais, email e comissão PRISM por evento.",
  inputSchema: {
    include_inactive: z.boolean().optional().describe("Incluir fotógrafos inactivos."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_inactive }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("photographers")
      .select("id, full_name, initials, email, active, prism_commission")
      .order("initials");
    if (!include_inactive) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, photographers: data ?? [] });
  },
});
