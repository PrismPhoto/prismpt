## Correcções no resumo "Por pagar aos fotógrafos"

### 1. Contar pagamento "Direto ao Fotógrafo"

Actualmente o resumo só conta o pagamento final como crédito quando `final_payment_method === "prism"`. Da perspectiva do fotógrafo, se o cliente lhe pagou directamente, ele **também já recebeu** — logo deixa de estar em falta.

**Correcção em `src/routes/_authenticated/eventos.tsx`** (bloco do resumo):
- Mudar `finalCredit` para contar sempre que `s.final_payment_received` for `true`, independentemente do método.

> Nota: `financeiro.tsx` mantém a distinção (lá interessa o que a *PRISM* deve), só o resumo dentro do evento muda — é a vista do fotógrafo.

### 2. Externo: adicionar input "Pago"

O slot Externo não tem hoje nenhum checkbox de pagamento — por isso aparece sempre "falta X" no resumo. Adicionar uma forma simples de marcar como pago.

**Mudanças em `PhotogSlot` (externo)**:
- Por baixo do "Valor a pagar €", adicionar:
  - Checkbox **"Pago"** (`slot.final_payment_received`)
  - Quando marcado: campo **Data** (`final_payment_date`) e **Método** (`final_payment_method`, ex.: "prism" / "direto" / texto livre — manter Input livre tal como nos Prism, para consistência).
  - Valor pago assume-se = `fee` do externo (não há split sinal/final no externo).

**Mudanças em `save()`** (linhas 352-357):
- Para slots externos, deixar de zerar `final_payment_received/value/date/method`. Persistir:
  - `final_payment_received: !!s.final_payment_received`
  - `final_payment_value: s.final_payment_received ? Number(s.fee || 0) : 0`
  - `final_payment_date: s.final_payment_date || null`
  - `final_payment_method: s.final_payment_method || null`
- `deposit_*` continua a zero para externos (não há sinal).

### 3. Resumo: tratar externo como totalmente pago quando marcado

No cálculo do `paid` para externos: se `final_payment_received` → `paid = fee` (já fica coberto pelo ponto 1 + persistência do valor).

### Ficheiros tocados

- `src/routes/_authenticated/eventos.tsx` — lógica do resumo, JSX do `PhotogSlot` externo, `save()`.

### Sem alterações

- BD (já tem todos os campos), `fee-distribution.ts`, `financeiro.tsx`.
