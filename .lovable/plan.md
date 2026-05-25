## Problema

No slot "Externo" do evento, hoje:
- O fotógrafo é escolhido da lista `photographers` (não permite externos).
- O fee é o valor fixo definido no pacote (`fee_distribution`), sem possibilidade de ajuste por evento.

Pretendido: poder escrever o nome/iniciais do externo livremente e editar o valor pago a esse externo neste evento específico (default = valor fixo do pacote, normalmente 450€).

## Mudanças

### 1. Base de dados

Migração em `event_photographers`:
- `photographer_id` → passar a **nullable** (externo não tem registo na tabela `photographers`).
- Adicionar `external_name text` nullable — preenchido só em slots externos.
- Constraint suave: para cada linha, ou `photographer_id` está preenchido, ou `external_name` está preenchido (CHECK).

RLS continua igual; a política de leitura por fotógrafo (`photographer_id = user_id`) simplesmente não devolve linhas externas, o que é o comportamento correcto.

### 2. `src/routes/_authenticated/eventos.tsx`

**Estado do slot externo:** acrescentar `external_name: string` ao objecto do slot (a par de `photographer_id`, `fee`, etc.). No load do evento, popular a partir de `ep.external_name`.

**`PhotogSlot` quando `isExternal`:**
- Substituir o `<Select>` de fotógrafo por um `<Input>` de texto livre ("Nome / iniciais do externo").
- Mostrar o campo "Fee €" **editável** (já existe, mas hoje é só leitura). Default = valor fixo de `distribution[i].value` do pacote.
- Esconder o campo "Comissão €" (já está disabled; passar a não renderizar) e os blocos de sinal/pagamento final ao fotógrafo (não aplicáveis a externos — é só uma despesa fixa).

**Cálculo de fee (`computeSlotFee` em `src/lib/fee-distribution.ts`):**
- Para slots `fixed`, em vez de devolver sempre `distribution[idx].value`, o evento passa a guardar o fee editado em `slot.fee`. A função continua a devolver o default; o `useEffect` que recomputa fees passa a **não sobrescrever** o fee de slots externos se o utilizador já o editou.
- Inicialização: ao mudar de pacote ou criar slot externo novo, pré-preencher `slot.fee` com `distribution[i].value`.

**`save()`:**
- Em slots externos: enviar `photographer_id: null`, `external_name: slot.external_name`, `fee: Number(slot.fee)`, `prism_commission: 0`, restantes campos a 0/false.
- Validação: se externo está marcado e `external_name` está vazio, ignorar o slot (não inserir).

### 3. Listagens

- `eventos.tsx` linha 118 (coluna "Fotógrafos"): hoje mostra `ep.photographers?.initials`. Passar a usar `ep.photographers?.initials ?? ep.external_name`.
- `financeiro.tsx`: 
  - O `select` continua a usar `event_photographers(*, photographers(...))`.
  - Externos têm `photographer_id = null` → não aparecem nos balanços por fotógrafo (correcto: não são da PRISM). Continuam a contar como custo do evento via `fee`, o que afecta o resultado líquido.
  - `feeWithExtras` / totais continuam correctos porque iteram `event_photographers` independentemente do `photographer_id`.
  - Onde se agrupa por `ep.photographer_id` (`balances[k]`), saltar linhas com `photographer_id` null.

### 4. Fora de scope

- Não criar tabela separada para "externos recorrentes" — é só um campo de texto por evento.
- Pacotes (`pacotes.tsx`) não mudam — continuam a definir o default `fixed` do externo na `fee_distribution`.

## Pergunta

Confirmas que o externo **não deve aparecer** nos balanços/financeiro por fotógrafo (é apenas um custo do evento), certo?
