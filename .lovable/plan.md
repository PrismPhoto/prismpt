## Mudanças

### 1. `src/routes/_authenticated/fotografos/$id.tsx` — opção (A) mais limpa

O `fee` em `event_photographers` já é líquido (split − comissão PRISM). Remover a dupla subtração:

- Apagar `const commission = …` e tudo que o usa.
- Apagar os KPIs "Comissão PRISM" e "Líquido". Manter: **Faturado**, **Pago**, **Pendente** (Pendente = Faturado − Pago).
- Na tabela de eventos: remover colunas "Comissão PRISM" e "Líquido". Manter "Fee" (= valor líquido já).
- Atualizar `EventTable` para não receber `commission`.

### 2. `src/routes/_authenticated/financeiro.tsx` — adicionar KPIs de comissões

A comissão PRISM por evento/fotógrafo = `photographers.prism_commission` × nº de assignments desse fotógrafo. A query atual em Financeiro já traz `event_photographers(*, photographers(initials, full_name))` mas não traz `prism_commission` — preciso adicioná-lo ao select (`photographers(initials, full_name, prism_commission)`).

Novo KPI **"Comissões PRISM"**:
- Quando há fotógrafo ativo (`activePhotographerId`): soma de `prism_commission` por cada assignment desse fotógrafo nos eventos filtrados.
- Quando manager sem filtro de fotógrafo: soma de `prism_commission` em todos os `event_photographers` dos eventos filtrados (= receita de comissões da PRISM).

Adicionar à grid de KPIs (sempre visível). Posicionar a seguir a "Por pagar".

Também adicionar coluna **"Comissão PRISM"** na tabela "Caixa por fotógrafo" (manager): nº de eventos × commission desse fotógrafo, para visibilidade.

### Notas

- Não mexer na tabela "Detalhe por evento" do Financeiro — os badges de fees já mostram o valor líquido correto.
- Não mexer no cálculo de fee em `eventos.tsx`.
