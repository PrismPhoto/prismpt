import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEvents from "./tools/list-events";
import getEvent from "./tools/get-event";
import listLeads from "./tools/list-leads";
import createLead from "./tools/create-lead";
import listPhotographers from "./tools/list-photographers";
import financialSummary from "./tools/financial-summary";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "prism-lightbox",
  title: "PRISM Lightbox",
  version: "0.1.0",
  instructions:
    "Ferramentas de gestão da PRISM Storytellers: consultar eventos/casamentos e o seu detalhe, listar e criar leads, listar fotógrafos e obter o resumo financeiro anual. Os dados são acedidos como o utilizador autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listEvents, getEvent, listLeads, createLead, listPhotographers, financialSummary],
});
