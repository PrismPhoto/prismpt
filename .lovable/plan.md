## Remover a "data de adjudicação"

Hoje há dois campos quase redundantes em `events`:
- `adjudication_date` — preenchida automaticamente quando uma lead é adjudicada (= dia da conversão).
- `deposit_paid_date` — quando o sinal foi efectivamente pago.

Na prática coincidem. Vamos manter só o sinal e tratar a adjudicação como implícita (lead em estado "Adjudicado" + evento criado).

### Mudanças

**1. UI — `src/components/event-form.tsx`**
- Remover o campo "Data adjudicação" do bloco Pagamentos. Fica só Sinal (valor / pago / data / método) + Pagamento final.

**2. Lista — `src/routes/_authenticated/eventos.index.tsx`**
- Se houver coluna/ordenação por `adjudication_date`, passar a usar `deposit_paid_date` (ou `event_date`, conforme já está). Verificar e ajustar.

**3. Leads — `src/routes/_authenticated/leads.tsx`**
- Ao adjudicar, deixar de escrever `adjudication_date` no insert do evento. O estado "Adjudicado" + existência do evento já comunicam isso.

**4. Financeiro — `src/routes/_authenticated/financeiro.tsx`**
- Confirmar que nada depende de `adjudication_date` nos KPIs/filtros. Se sim, trocar para `event_date` ou `deposit_paid_date`.

**5. Migração — drop da coluna**
- `ALTER TABLE public.events DROP COLUMN adjudication_date;`
- Faz-se *depois* de todas as referências em código estarem removidas, para evitar quebrar selects (`select *`).

### Notas

- Não mexe em `leads` (não tem este campo).
- Não mexe em RLS nem em outros fluxos.
- Os dados históricos de `adjudication_date` perdem-se. Se quiseres preservar, diz-me antes de aprovar — copio para `deposit_paid_date` quando este estiver vazio, antes do drop.
