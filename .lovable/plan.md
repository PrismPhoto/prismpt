## Problema

Na página **Financeiro**, quando se filtra por um fotógrafo específico (ex.: ZD):

- **Receita** mostra o `total_value` completo do evento (ex.: 2000€), mesmo que o ZD só seja 1 dos 2 fotógrafos.
- **Fees totais / pagos / por pagar** também somam os fees de *todos* os fotógrafos do evento, não só do ZD.
- **Sinal / Final / WP** idem — valores totais do evento.

Só os badges por evento já mostram corretamente apenas a linha do fotógrafo, mas os KPIs no topo não.

## Solução

Em `src/routes/_authenticated/financeiro.tsx`, quando há um fotógrafo selecionado (role `photographer`, ou manager com `photogF !== "all"`), calcular os KPIs apenas com a fatia desse fotógrafo:

1. Determinar `activePhotographerId` (= `photographerId` se role photographer, senão `photogF` quando ≠ "all", senão `null`).
2. Quando `activePhotographerId` está definido:
   - **Fees totais** = soma de `feeWithExtras(e, ep)` apenas para o `ep` desse fotógrafo.
   - **Fees pagos** = soma de `paidToPhotographer(e, ep)` apenas para esse `ep`.
   - **Por pagar** = Fees totais − Fees pagos (já correto por consequência).
   - **Receita** (visível só para manager): mostrar a fatia do fotógrafo = `feeWithExtras` desse `ep` (ou seja, o que o evento "vale" para ele). Alternativa: esconder Receita/Recebido/Pendente/WP nesse modo, já que esses valores são do evento todo, não atribuíveis a um fotógrafo. **Decisão proposta**: esconder Receita / Recebido / Pendente / WP quando há fotógrafo selecionado, e mostrar apenas os KPIs de fees (que são o que faz sentido por fotógrafo). Confirmar abaixo.
3. Na tabela "Detalhe por evento", quando há fotógrafo selecionado, esconder/zerar as colunas Valor/Sinal/Final/WP (são do evento, não do fotógrafo) — ou deixá-las como contexto. **Decisão proposta**: manter as colunas como contexto do evento, sem alterar.
4. A secção "Caixa por fotógrafo" (manager) continua igual.

## Pergunta antes de implementar

Quando filtras por 1 fotógrafo, o que esperas ver nos KPIs do topo?

- **(A)** Só os KPIs de fees desse fotógrafo (Fees totais / pagos / por pagar). Esconder Receita, Recebido, Pendente, WP.
- **(B)** Manter todos os KPIs mas converter Receita/Recebido/Pendente para a fatia do fotógrafo (fee+extras / pago / por pagar) — efetivamente duplica a info dos fees.
- **(C)** Manter Receita = total do evento (atual) mas corrigir só os fees para a fatia do fotógrafo.

A minha recomendação é **(A)**.
