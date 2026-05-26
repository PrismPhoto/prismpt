## Alinhar `/financeiro` com a vista do fotógrafo

Hoje o `financeiro.tsx` só conta o pagamento final como crédito quando `final_payment_method === "prism"`. Por isso aparece "falta" nos badges (e nos KPIs) sempre que o fotógrafo recebeu directo do cliente ou quando é um externo já pago. Vamos passar tudo para a perspectiva do fotógrafo: se `final_payment_received` está marcado, está pago.

### Mudanças em `src/routes/_authenticated/financeiro.tsx`

1. **`paidToPhotographer` / `owedToPhotographer`** — remover a condição `final_payment_method === "prism"`. Crédito do final passa a ser:
   - Externos: se `final_payment_received`, conta `fee` (não há split sinal/final).
   - PRISM: se `final_payment_received`, conta `final_payment_value`.
   - Sinal: continua a contar `deposit_amount` quando `deposit_paid`.

2. **Badges no "Detalhe por evento"** — passam a usar a mesma lógica; deixa de aparecer "falta" quando o fotógrafo já recebeu (PRISM ou directo).

3. **KPIs "Fees pagos" / "Por pagar"** — passam a reflectir a vista do fotógrafo (alinhado com o resumo dentro do evento).

4. **"Caixa por fotógrafo"** — continua a agregar só os slots PRISM (já filtra `photographer_id` nulo), mas com a nova lógica de pago. Saldo `owed - paid` fica coerente.

### Sem alterações

- Schema (todos os campos já existem).
- `eventos.tsx` (já está nesta lógica).
- `fee-distribution.ts`.

### Ficheiros tocados

- `src/routes/_authenticated/financeiro.tsx` — só funções `paidToPhotographer` e `owedToPhotographer`.
