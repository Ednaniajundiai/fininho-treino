# Contratos: Fichas de treino

**Atualizado em**: 2026-11-17 pela PR do roteiro (descoberta). A `002-fichas-treino` implementa e
ajusta aqui o que mudar na entrevista dela.

## [C-01] Estrutura da ficha

**Usado por**: `002-fichas-treino` (produz), `003-registro-sessao` e `006-graphql-historico`
(consomem).

A ficha é o que o professor prescreve para um aluno: dias em rotação, cada um com itens em ordem.

**Regras**:

- Ficha pertence a um aluno e ao professor dele (posse: `autenticacao/C-01`). Só o professor
  cria, edita, atribui e arquiva.
- **Uma ficha ativa por aluno**. Ativar outra arquiva a anterior; ficha arquivada continua
  legível no histórico.
- Os dias **não são dias da semana**: são uma rotação, com rótulo em sequência (A, B, C, …) e um
  título. A ficha tem pelo menos um dia.
- Cada dia tem pelo menos um item, em ordem definida pelo professor.
- **Item de força**: exercício do catálogo, número de séries (1 ou mais), faixa com mínimo e
  máximo (mínimo ≤ máximo) e unidade **repetições** ou **segundos**; observação opcional.
- **Item de cardio**: modalidade (`esteira`, `bike`, `escada` ou `livre`), duração mínima e
  máxima em minutos (mínimo ≤ máximo); observação opcional.
- Um dia pode misturar itens de força e de cardio (ex.: musculação + 15 min de bike).

**Formato**:

```text
ficha:     id, alunoId, professorId, nome, status (ativa | arquivada), dias[]
dia:       rotulo (A, B, C…), titulo, ordem, itens[]
item:      ordem, tipo (forca | cardio), observacao?
  forca:   exercicioId, series, faixaMin, faixaMax, unidade (repeticoes | segundos)
  cardio:  modalidade (esteira | bike | escada | livre), duracaoMinMin, duracaoMaxMin
```

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta.

## [C-02] Catálogo de exercícios

**Usado por**: `002` (produz), `003` (progressão por exercício), `006` (histórico por exercício).

**Regras**:

- Cada professor tem o próprio catálogo; o aluno só vê os exercícios que estão na ficha dele.
- Exercício tem nome (único no catálogo do professor, sem diferença de maiúsculas) e tipo de
  medida padrão (`repeticoes` ou `segundos`).
- Exercício usado em ficha ou sessão não é apagado: é desativado e some das novas escolhas.

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta.

## [C-03] Rotação: próximo dia

**Usado por**: `002` (define a ordem dos dias), `003` (calcula e mostra o próximo dia).

**Regras**:

- O próximo dia é o seguinte, na ordem da ficha ativa, ao dia da última sessão registrada nela;
  depois do último dia, volta ao primeiro.
- Sem sessão registrada na ficha ativa, o próximo é o primeiro dia.
- Dia perdido não vence nem acumula: o próximo continua sendo o seguinte ao último feito.
- O aluno pode registrar outro dia que não o sugerido; a rotação segue a partir do que foi
  registrado.

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta.
