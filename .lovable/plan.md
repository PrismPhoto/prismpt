# Extras atribuídos e valor do fotógrafo (Inês e Nicolas)

## O que encontrei nos dados

Existem **dois eventos "Inês e Nicolas"**, ambos criados no mesmo instante, ambos com o mesmo pacote (Prestige, 5.450€), os mesmos fotógrafos (JMC + RCD) e o mesmo extra Pre-Wedding de 550€ atribuído ao JMC:

- 18 Jun 2027 — notas "1 fotógrafo (a definir)" — fee gravado do JMC: **2.075€**
- 19 Jun 2027 — notas "JMC + RCD + 1" — fee gravado do JMC: **2.225€**

Daí o 2.225€ no painel do fotógrafo: é o outro evento da lista, não o que está aberto. A diferença de 150€ é a comissão PRISM, que está gravada no primeiro (150€) e a zero no segundo.

Além disso, confirmei que **os extras nunca entram no valor do fotógrafo**: o cálculo divide apenas o valor do pacote pelos slots, e o campo "fotógrafo" do extra é guardado mas nunca usado em nenhum cálculo. Por isso os 550€ do Pre-Wedding do JMC não aparecem em lado nenhum.

## O que proponho fazer

1. **Extra atribuído passa a somar ao fotógrafo**
   - Os extras com fotógrafo atribuído são retirados do bolo a dividir e somados inteiros a esse fotógrafo.
   - Extras sem fotógrafo continuam a ser receita do evento, divididos pela distribuição normal do pacote.
   - Mostrar na linha de cada fotógrafo uma decomposição: "Pacote X€ + Extras Y€ − Comissão PRISM Z€ = Valor final".

2. **Mesmo cálculo no painel do fotógrafo e no financeiro**
   - Hoje o painel usa o valor gravado no evento; passa a usar o mesmo cálculo (pacote + extras atribuídos − comissão), para não haver dois números diferentes para o mesmo casamento.
   - Coluna de extras visível na tabela do painel do fotógrafo.

3. **Recalcular os valores já gravados** dos eventos existentes, para os números antigos (gravados antes dos extras terem sido adicionados) passarem a bater certo.

4. **Duplicado**: preciso de saber o que fazer — ver pergunta abaixo.

## Detalhes técnicos

- `src/lib/fee-distribution.ts`: `computeSlotFee` passa a receber os extras do evento; deduz do `totalValue` a soma dos extras com `photographer_id` e soma ao slot correspondente o total dos seus extras.
- `src/components/event-form.tsx`: passa `extras` ao cálculo (já os tem em estado, logo actualiza em tempo real) e grava `fee` com esse valor; decomposição no bloco "Valor final do fotógrafo".
- `src/routes/_authenticated/fotografos/$id.tsx`: `effectiveFee` deixa de preferir o `fee` gravado e passa a calcular sempre com `event_extras` incluídos na query.
- `src/routes/_authenticated/financeiro.tsx`: alinhado com a mesma função.
