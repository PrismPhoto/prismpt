## Mudança

No formulário do evento em `src/routes/_authenticated/eventos.tsx`, o campo **"Pagamento final (€)"** passa a ser auto-preenchido (mas editável).

### Cálculo sugerido
`suggested = total_value + Σ event_extras.total − (deposit_paid_date ? deposit_amount : 0)`

- `extrasTotal` já está calculado no componente (linha 413).
- Sinal só é descontado se `deposit_paid_date` estiver preenchido (= sinal já recebido). Caso contrário soma tudo.

### Comportamento
- Quando o utilizador abre o formulário e o campo está vazio (`final_payment_value === ""` ou `0`), pré-preenche com o valor sugerido.
- Mostrar um pequeno hint por baixo do input: `Sugerido: {EUR(suggested)}` com um link/botão "usar sugerido" que repõe o valor calculado (útil se o utilizador editou e quer voltar ao auto).
- Mantém-se totalmente editável — guarda o que estiver no input.

### Implementação
1. Calcular `suggestedFinalPayment` no `EventDialog` a partir de `form.total_value`, `form.deposit_amount`, `form.deposit_paid_date` e `extrasTotal`.
2. Num `useEffect` (com guard tipo "só se ainda não foi tocado / está vazio"), preencher `form.final_payment_value` com o sugerido. Para não cair em loop infinito como antes, condicionar a `form.final_payment_value === "" || Number(form.final_payment_value) === 0`, e comparar antes de chamar `setForm`.
3. Adicionar o hint visual com botão "usar sugerido" abaixo do input do "Pagamento final (€)".

### Fora de scope (confirmado)
- Manter os campos `final_payment_*` por slot de fotógrafo (semântica diferente: indica quem recebeu o pagamento direto do cliente vs PRISM — usado pelo Financeiro).
- Sem alterações à BD.
