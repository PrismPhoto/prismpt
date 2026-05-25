## Objetivo

1. Remover o campo redundante **Comissão Prism** ao nível do evento.
2. Tornar a **comissão Prism por fotógrafo editável dentro do evento** — vem pré-preenchida com o valor default do fotógrafo (ex. 150€), mas pode ser ajustada (incluindo 0) por evento.

## Mudanças

### Base de dados
- Migração: adicionar coluna `prism_commission numeric NOT NULL DEFAULT 0` à tabela `event_photographers`. Representa a comissão Prism efetivamente cobrada nesse evento, a esse fotógrafo.
- (Manter `photographers.prism_commission` como default; não tocar.)
- (Não remover já `events.prism_commission` para evitar partir dados/queries antigos — apenas deixa de ser usado/escrito. Pode ser removido num clean-up futuro.)

### `src/routes/_authenticated/eventos.tsx`
- Remover do form o campo "Comissão Prism" (linha 355) e o estado `prism_commission` (linhas 145, 268).
- Em cada slot (`PhotogSlot`):
  - Novo campo numérico "Comissão Prism €" editável ao lado do Fee.
  - Inicialização do slot: se já existe `event_photographers.prism_commission` usa esse valor; caso contrário usa `photographers.prism_commission` do fotógrafo selecionado.
  - Ao mudar de fotógrafo num slot vazio (sem override prévio), pré-preencher com o default do novo fotógrafo.
- `computeFee` passa a usar `slot.prism_commission` (override) em vez de `photographers.prism_commission`.
- `useEffect` que recalcula fees passa a depender também das comissões dos slots.
- `save()`: incluir `prism_commission` nas rows inseridas em `event_photographers`.

### `src/routes/_authenticated/financeiro.tsx`
- Trocar `ep.photographers?.prism_commission` por `ep.prism_commission` nas duas linhas (78, 89) para refletir o valor real cobrado no evento.
- Atualizar o `select` para deixar de precisar de `photographers(prism_commission)` (mantém `initials, full_name`).

## Fora de scope
- Não mexer em `events.prism_commission` (coluna fica órfã, sem UI).
- Sem alterações no `fotografos/$id.tsx` (continua a editar o default por fotógrafo).
- Sem retroactividade: eventos antigos ficam com `prism_commission = 0` até serem reabertos/guardados (posso correr um backfill se preferires — diz-me).

## Pergunta
Queres que faça **backfill** dos eventos existentes (preencher `event_photographers.prism_commission` com o valor atual de `photographers.prism_commission` de cada fotógrafo) ao aplicar a migração? Recomendo que sim, para o Financeiro não cair para 0.
