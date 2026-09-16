# Plano: sinal directo ao fotógrafo marca checkbox por defeito

## O que vamos fazer
Na página de edição de um evento, quando o "Destino do sinal" está configurado como "Directo ao fotógrafo", a checkbox **"Sinal devolvido ao fotógrafo"** do respectivo fotógrafo passa a estar seleccionada por defeito. O utilizador pode desmarcá-la manualmente.

## Situações cobertas
- Ao abrir um evento guardado cujo `deposit_method` já é `directo:<iniciais>`, a checkbox do fotógrafo aparece seleccionada.
- Quando o utilizador muda o destino do sinal para "Directo ao fotógrafo" e escolhe o fotógrafo, a checkbox selecciona-se automaticamente.
- A checkbox continua editável: se o utilizador a desmarcar, o estado guarda-se assim.

## Ficheiro a alterar
- `src/components/event-form.tsx`

## Detalhes técnicos
1. **Estado inicial dos slots** (`useState` que monta `slots` a partir do evento):
   - Ler `event?.deposit_method`.
   - Se começar com `directo:`, extrair as iniciais.
   - Para cada slot interno, comparar as iniciais do fotógrafo atribuído com as iniciais do destino.
   - Se corresponderem e o evento não tiver um valor explícito `deposit_paid: true`, definir `deposit_paid: true` por defeito.

2. **Reacção a mudanças do destino do sinal**:
   - Adicionar um `useEffect` que observa `form.deposit_method`.
   - Quando `deposit_method` passa a `directo:<iniciais>` e o slot do fotógrafo ainda tem `deposit_paid: false`, definir `deposit_paid: true`.
   - Implementar de forma idempotente (não re-seleccionar se o utilizador já desmarcou manualmente, excepto se mudar o destino e voltar a colocar o mesmo fotógrafo).

3. **UI/UX**:
   - Manter o `<Checkbox checked={slot.deposit_paid} onCheckedChange={...} />` sem alterações, para continuar editável.
   - Adicionar uma pequena nota textual junto à checkbox: "Marcado por defeito porque o sinal foi pago directamente a este fotógrafo."

## Critérios de validação
- No evento da Camille e Frederico (ou outro com sinal directo), a checkbox "Sinal devolvido ao fotógrafo" do fotógrafo seleccionado aparece com tick.
- Desmarcar a checkbox e guardar mantém o estado desmarcado.
- Build sem erros.
