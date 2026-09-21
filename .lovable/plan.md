# Aviso de fotógrafo em duplicado na mesma data

Impedir que o mesmo fotógrafo fique atribuído a dois eventos no mesmo dia, e avisar quando está marcado como indisponível nessa data.

## Comportamento

**Na página do evento (/eventos/:id)**
- Ao escolher um fotógrafo, verifica-se se ele já está noutro evento na mesma data ou se tem essa data marcada como indisponível.
- O cartão desse fotógrafo mostra um alerta vermelho: "Já está no evento X a 19 Jun 2027" ou "Marcado como indisponível nesta data".
- Guardar fica bloqueado enquanto houver conflito de evento: o botão "Guardar" (topo e fundo) fica desactivado e aparece uma mensagem a explicar porquê.
- A indisponibilidade é um aviso, não bloqueia (a agenda pessoal pode estar desactualizada).

**Na lista de eventos**
- Ícone de aviso vermelho na linha do evento cujo dia tem o mesmo fotógrafo repetido, com descrição ao passar o rato.

**No calendário**
- O dia com conflito fica assinalado com o mesmo ícone de aviso e indica que fotógrafo está duplicado.

**No painel do fotógrafo**
- As linhas de eventos em datas onde ele tem mais do que um evento ficam assinaladas com o aviso.

## Detalhes técnicos

- Novo helper `src/lib/conflicts.ts`:
  - `usePhotographerConflicts(date, excludeEventId)` — consulta `event_photographers` com `events!inner(id, client_name, event_date, status)` filtrando `event_date = date` e status diferente de `Cancelado`, mais `photographer_unavailability` para a mesma data; devolve mapa `photographer_id -> { events[], unavailable }`.
  - `findDuplicatePhotographers(events)` — puro, agrupa uma lista já carregada por `event_date` + `photographer_id` e devolve os ids em conflito (usado na lista, calendário e painel do fotógrafo, sem queries extra).
- `src/components/event-form.tsx`: usar o hook com `form.event_date`; passar o conflito a `PhotogSlot` para o alerta por slot; calcular `hasBlockingConflict` e usá-lo para desactivar a acção de guardar (também exposto via `saveRef` para o botão do topo em `eventos.$id.tsx`).
- `src/routes/_authenticated/eventos.index.tsx`, `calendario.tsx` e `fotografos/$id.tsx`: aplicar `findDuplicatePhotographers` sobre os dados já carregados e mostrar o ícone `AlertTriangle` com tooltip.
- Sem alterações à base de dados.
