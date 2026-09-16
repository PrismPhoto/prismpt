# Fotógrafo externo em falta nos pacotes +10% / +15%

## O que se passa

No casamento Camille e Frederico (28 ago 2027) o pacote é o Prime +15%, que prevê um fotógrafo externo — mas a linha para o indicar não aparece.

Motivo: só os pacotes na versão base (27) têm a divisão de honorários configurada. As versões +10% e +15% estão vazias, por isso a app assume um único fotógrafo e não mostra o slot do externo. Há ainda uma inconsistência: nas versões base a marca de "tem externo" está num campo e nas outras versões noutro.

## O que vai ser feito

1. Copiar a divisão de honorários da versão base para todas as outras versões do mesmo pacote (Prime, Prestige, Premium, Signature, Ultimate), mantendo o slot do fotógrafo externo a 450€ onde existe.
2. Uniformizar a marca de "tem fotógrafo externo" em todas as versões do mesmo pacote.
3. Tornar o cálculo tolerante: quando um pacote ainda não tiver divisão configurada, a app passa a gerar os slots a partir do número de fotógrafos do pacote e da marca de externo (qualquer um dos dois campos), em vez de assumir um só fotógrafo.

Depois disto, na página do evento aparece a linha "Fotógrafo externo" com o nome a preencher e o valor fixo, e o valor do fotógrafo PRISM passa a ser calculado sobre o valor do pacote menos o valor do externo.

## Detalhes técnicos

- Migração SQL: `UPDATE packages` a copiar `fee_distribution` da linha `version = 27` com o mesmo `name` para as versões sem distribuição; alinhar `has_external_photographer` e `has_external` (OR das duas) por nome de pacote.
- `src/components/event-form.tsx`: o fallback em `distribution` e na inicialização dos `slots` passa a usar `defaultDistribution(pkg.num_prism_photographers, pkg.has_external_photographer || pkg.has_external)` em vez de `defaultDistribution(slots.length || 1, false)`.
- Sem alterações ao evento em si: o valor de pacote 5.500€ e o total ficam como estão; o fee do fotógrafo PRISM é recalculado automaticamente quando o slot externo passar a existir.
