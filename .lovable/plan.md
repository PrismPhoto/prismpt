# Ajustes no formulário do evento

## 1. Externo editável reflete-se no fee do Prism

**Problema actual:** `computeSlotFee` usa o `distribution[i].value` do pacote (450€) como valor fixo do externo. Se editares "Valor a pagar" do Externo no evento (ex.: 500€), o fee do Prism continua a calcular com 450€.

**Correcção:** ao calcular o fee dos slots Prism, usar os valores **actuais** dos slots fixos no formulário, não os do pacote.

- Em `src/lib/fee-distribution.ts`: aceitar um override opcional com os valores reais dos slots fixos (ex.: `computeSlotFee(distribution, idx, total, commission, fixedOverrides?)`).
- Em `eventos.tsx`: passar `form.slots[i].fee` dos slots externos ao calcular, tanto no `useEffect` que recomputa, como no `save()`.

Resultado: editar "Valor a pagar" do Externo para 500€ → fee do Prism passa de 2900€ para 2850€ automaticamente.

## 2. Reordenar e separar secções do formulário

Nova ordem dentro do diálogo de evento:

```
1. Dados base (data, cliente, tipo, pacote, valor, WP, pens)
2. Pagamentos
   ├─ Adjudicação + Sinal   (bloco com borda)
   │   ├─ Data adjudicação
   │   ├─ Sinal (€) + Método + Data sinal pago
   └─ Pagamento final        (bloco com borda)
       ├─ Valor (com sugestão e botão "usar sugerido")
       ├─ Data + Método
3. Fotógrafos  (cada slot — externo editável reflecte em Prism)
4. Extras + totais
5. Notas
```

Mudanças concretas em `eventos.tsx`:
- Mover o `<h4>Pagamentos</h4>` + campos de adjudicação/sinal/final para **antes** do `<h4>Fotógrafos</h4>`.
- Envolver "Adjudicação + Sinal" e "Pagamento final" em dois cartões/containers separados (`rounded-md border p-3 bg-muted/20`) com sub-títulos.
- Manter os campos existentes — sem alterar a BD nem o `save()`.

## Ficheiros tocados
- `src/lib/fee-distribution.ts` — assinatura de `computeSlotFee` com override de fixos
- `src/routes/_authenticated/eventos.tsx` — reordenar JSX, agrupar pagamentos em 2 blocos, passar fees dos externos ao calcular Prism

## Sem alterações
- Schema da BD
- `pacotes.tsx` (distribuição continua a definir-se no pacote)
- `financeiro.tsx`
