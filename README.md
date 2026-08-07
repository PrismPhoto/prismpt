# PRISM Lightbox

Build an event photography management platform called "PRISM Management" for PRISM Storytellers (prism.pt), a collective of 9 photographers based in Lisbon.

PHOTOGRAPHERS: ZD (Zé Diogo Lucena), SC (Salvador Colaço), RV (Rui Valido), JMC (João Maria Catarino), LNG (Luís Nobre Guedes), FR (Francisco Rivotti), RCD (Rodrigo Costa Duarte), SP (Simão Pernas), FLC (Filipe Leão Cabreira)

EVENT TYPES: Casamento, Corporate, Festa, Baptizado, Outro. All modules must filter by event type.

PACKAGES (versioned — historical pricing must be preserved):

Version 3 (current):

- Signature: 2500€ (1 Prism, up to 100 guests)

- Prime: 3350€ (1 Prism + 1 external)

- Prestige: 4500€ (2 Prism)

- Premium: 4900€ (2 Prism + 1 external)

- Ultimate: 7000€ (3 Prism)

All packages: +VAT, up to 12h, 400€ booking deposit.

Each package can have a Wedding Planner variant with +10% or +15% on base price.

Final price per event is always manually adjustable regardless of package.

WEDDING PLANNERS: separate table. Fields: name, email, commission_percentage (10 or 15). Each event can optionally be linked to a wedding planner — commission value auto-calculated but editable.

USER ROLES:

- Manager (1 user): full access to everything

- Photographer (up to 9 users): read-only, sees only their own events, fees, and balance

TECH STACK: React + Supabase. Use Supabase Auth for role-based access. Portuguese language throughout the UI.

BUILD THESE MODULES:

1. DASHBOARD (manager only)

- KPIs: total events this year, total revenue adjudicated, total received, total pending, events per photographer

- Upcoming events next 30 days

- Recent leads

- Filter by event type and year

2. LEADS MODULE

- Pipeline: Novo → Proposta Enviada → Adjudicado → Arquivo

- Fields: date received, client name, event date, email, pax, location, event type, package, source (email/website/instagram/wedding planner), wedding planner (optional, linked to wedding planners table), assigned photographer(s), notes, status

- All leads organised by event year (not year received)

- Actions: change status, assign photographers, convert to event (adjudicate), archive

- Filters: status, photographer, month, event type, year

- Draft email action: prepare proposal draft (does not send automatically — manager reviews and sends)

3. EVENTS MODULE (called "Eventos" in UI)

- Fields: event date, client name, email, pax, location, event type, package (linked to packages table), total value (manually editable), Prism commission, wedding planner (optional) + WP commission value (auto-calculated, editable), photographer 1 (initials + fee), photographer 2 (optional, initials + fee), photographer 3 (optional, initials + fee), has_pens_caixa (boolean, adds 100€ cost), adjudication date, deposit amount (default 400€, editable), deposit method (Revolut/bank transfer/Cyclik/other), deposit paid date, final payment value, final payment date, final payment method, internal notes, event notes (synced with calendar event description), status (Confirmado / Aguarda Sinal / Cancelado)

- Organised by event year

- Export to CSV

- Year filter

4. CALENDAR MODULE

- Monthly view

- Color coding: Confirmado (green), Aguarda Sinal (yellow), Lead (blue), Fotógrafo off (grey), Cancelado (red)

- Click day: see all events and leads for that day

- Photographer filter to check individual availability

- Event detail shows internal notes and event notes

5. FINANCIAL MODULE (manager sees all, photographer sees only their own)

- Per event: full financial breakdown

- Per photographer: fees owed, fees paid, balance (their "caixa")

- Annual summary: total revenue, total WP commissions, total photographer fees paid, total pending

- Filters: year, photographer, event type

6. PHOTOGRAPHERS MODULE

- Profile: initials, full name, personal email, active status

- Stats: events this year, total revenue, total fees

- Availability: mark days off (creates "INITIALS off" in calendar)

- Photographer login sees only their own view

7. PACKAGES MODULE

- Package list with version number

- Fields: name, version, base price, description, num Prism photographers, has external photographer, active

- WP variant toggle per package (+10% or +15%)

- Historical versions preserved (old events keep their package version)

8. WEDDING PLANNERS MODULE

- List of wedding planners

- Fields: name, email, commission percentage (10% or 15%), notes

- Stats: events referred, total WP commissions generated

9. SETTINGS (manager only)

- Gmail OAuth connect/disconnect

- Google Calendar OAuth connect/disconnect

- Calendar ID selector

- Email template editor (5 templates: Proposta, Follow-up, Pedido de Sinal, Confirmação, Lembrete pré-evento)

- Draft mode toggle (default ON — never send automatically without manager approval)

- Automation triggers: enable/disable each (follow-up 3 days, deposit request, confirmation, pre-event reminder X days before)

DESIGN: Clean, minimal, professional. Primary accent: #404f43 (green), secondary #d2c1b5. White backgrounds, subtle borders, Inter (sans-serif typography). Sidebar navigation. Mobile-responsive.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://prismpt.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9b374958-1942-41f3-b3fd-ce453d0a8833).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
