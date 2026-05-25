## Resumo "Por pagar aos fotógrafos" no formulário do evento

Adicionar um pequeno bloco de resumo dentro do diálogo de evento, **após a secção Fotógrafos** (antes de Extras), que mostra de relance o que ainda falta pagar a cada fotógrafo quando o sinal e/ou pagamento final ainda não foram registados.

### Layout

```text
┌─ Por pagar aos fotógrafos ──────────────────────┐
│ Prism 1 (RB)     fee 2900€   sinal —  final —   │
│   ↳ falta 2900€                                 │
│ Externo (JM)     fee  500€   sinal ✓  final —   │
│   ↳ falta  300€  (pago 200€ de 500€)            │
│ ─────────────────────────────────               │
│ Total em falta: 3200€                           │
└─────────────────────────────────────────────────┘
```

Container: `rounded-md border p-3 bg-muted/20`, só aparece se houver pelo menos um slot preenchido com valor em falta > 0. Slots já totalmente pagos não aparecem (para não poluir).

### Cálculo (por slot)

Reaproveita a mesma lógica de `financeiro.tsx`:
- **Total devido** = `slot.fee` (já calculado em tempo real no form)
- **Crédito sinal** = `slot.deposit_paid ? slot.deposit_amount : 0`
- **Crédito final** = `slot.final_payment_received && slot.final_payment_method === "prism" ? slot.final_payment_value : 0`
  *(se o cliente pagou directamente ao fotógrafo via outro método, não conta como dívida da PRISM)*
- **Falta** = `devido - sinal - final`

Para cada linha mostrar:
- nome/iniciais (Prism N com iniciais do fotógrafo, ou "Externo — nome")
- fee total
- estado sinal (✓ / —) e final (✓ / —)
- valor em falta a vermelho/destaque

Total agregado em baixo.

### Ficheiros tocados

- `src/routes/_authenticated/eventos.tsx` — adicionar bloco JSX entre Fotógrafos (linha ~484) e Extras (linha ~486), com cálculo inline a partir de `form.slots`.

### Sem alterações

- BD, `fee-distribution.ts`, `financeiro.tsx`, `pacotes.tsx`.
