## Problema

A divisão do fee está fixada em `SLOT_SPLITS = [0.5, 0.5, 0]` no `eventos.tsx`. Isso quebra:
- **Prime (1 Prism)**: deve ser 100%, não 50%.
- **3 fotógrafos Prism**: deve ser 33,33% cada.
- **Prime 1 Prism + 1 externo**: Prism leva 100% do total *menos* o custo fixo do externo (default 450€); externo leva o valor fixo. Sem comissão Prism para o externo.

Solução: tornar a distribuição **configurável por pacote**, com modo `percent` ou `fixed €` por slot.

## Mudanças

### 1. Base de dados (migração)

Adicionar coluna `fee_distribution jsonb` a `packages`. Formato:

```json
[
  { "mode": "percent", "value": 100 },
  { "mode": "fixed",   "value": 450 }
]
```

Comprimento do array = `num_prism_photographers + (has_external_photographer ? 1 : 0)`. Os primeiros `num_prism` entries são slots Prism; o último (se existir) é o externo.

**Backfill** dos pacotes existentes com base em `num_prism` / `has_external`:
- 1 Prism, 0 externo → `[{percent,100}]`
- 2 Prism, 0 externo → `[{percent,50},{percent,50}]`
- 3 Prism, 0 externo → 3× `{percent,33.34}` (último compensa arredondamento)
- 1 Prism, 1 externo → `[{percent,100},{fixed,450}]`
- 2 Prism, 1 externo → `[{percent,50},{percent,50},{fixed,450}]`

### 2. `src/routes/_authenticated/pacotes.tsx`

No `PkgForm`, adicionar secção **"Distribuição do valor"** que renderiza uma linha por slot (Prism 1, Prism 2, …, Externo). Cada linha:
- Toggle/Select `%` | `€ fixo`
- Input numérico para o valor

Sempre que `num_prism_photographers` ou `has_external_photographer` mudam, redimensionar o array de distribuição (preservar valores existentes onde possível, aplicar defaults aos novos slots: Prism→percent igualitário, Externo→fixed 450).

Validação suave: se a soma das `%` não der 100, mostrar aviso (mas permitir guardar).

Incluir `fee_distribution` no payload do `save`.

### 3. `src/routes/_authenticated/eventos.tsx`

Substituir o `SLOT_SPLITS` constante por uma derivação baseada no pacote selecionado:

```text
fee_distribution do pacote → para cada slot i:
  - se mode=="fixed": fee = value (sem comissão Prism)
  - se mode=="percent": fee = (total_value − Σ fixed_values) × (pct/100) − prism_commission
```

Carregar a `fee_distribution` do pacote selecionado (via `packages` query). Fallback se não houver pacote: divisão igualitária pelos slots preenchidos (comportamento atual generalizado).

Ajustar:
- `computeFee(slot, idx, totalValue, prismCommission, distribution)` → nova assinatura.
- Renderizar exactamente `distribution.length` slots (não fixos `[1,2,3]`); os slots externos marcados como tal e com label "Externo".
- Label do slot mostra `"X%"` ou `"€ Y fixo"` consoante o modo.
- Em slots `fixed` (externo), não pré-preencher `prism_commission` ao escolher fotógrafo (fica 0), e o fee é o valor fixo independentemente do `total_value`.
- `useEffect` de recompute depende também da distribuição.

### 4. Fora de scope

- Não tocar em `financeiro.tsx` (continua a ler `ep.prism_commission` e `ep.fee` já correctos).
- Não retroagir fees de eventos antigos — só serão recalculados quando o evento for reaberto/guardado.
- `event_photographers.position` mantém-se (1..N conforme distribuição).

## Pergunta

A linha do externo no formulário do evento deve continuar a permitir **escolher um fotógrafo** (mesmo sendo externo, para registo), ou deve ser apenas um campo livre tipo "Nome externo"? Hoje o slot 3 selecciona da lista `photographers` — assumo que mantemos isso (escolher da mesma lista) salvo indicação em contrário.
