# Contratos: Fichas de treino

**Atualizado em**: 2026-11-18 pela `002-fichas-treino`, que implementou os três contratos.

## [C-01] Estrutura da ficha

**Usado por**: `002-fichas-treino` (produz), `003-registro-sessao` e `006-graphql-historico`
(consomem).

A ficha é o que o professor prescreve para um aluno: dias em rotação, cada um com itens em ordem.

**Regras**:

- Ficha pertence a um aluno e ao professor dele (posse: `autenticacao/C-01`). Só o professor
  cria, edita, ativa, arquiva e duplica; ficha ou aluno de outro professor é "não encontrado".
- Estados: **rascunho**, **ativa** e **arquivada**. O rascunho é invisível ao aluno e à `003`
  (o aluno e as sessões só enxergam a ativa). A ficha nasce rascunho ou já ativa.
- **Uma ficha ativa por aluno**. Ativar outra arquiva a anterior; ficha arquivada continua
  legível no histórico.
- Ficha arquivada é **só leitura**: não é editada nem reativada. Para reaproveitá-la, o
  professor a duplica.
- O professor edita a ficha ativa livremente, mesmo com sessões já registradas.
- **Duplicar** cria ficha nova e independente, em rascunho, para qualquer aluno do mesmo
  professor (inclusive o mesmo aluno); qualquer ficha dele pode ser duplicada, mesmo arquivada.
- Os dias **não são dias da semana**: são uma rotação, com rótulo em sequência (A, B, C, …) e um
  título. A ficha **ativa** tem pelo menos um dia e cada dia dela pelo menos um item; o rascunho
  pode ficar sem dia ou com dia vazio (o mínimo só vale para ativar e para salvar a ativa).
- Teto, em qualquer estado: **10 dias por ficha** e **30 itens por dia**.
- Itens em ordem definida pelo professor.
- O item **não tem carga**: a carga existe só na sessão (`sessoes/C-01`).
- **Item de força**: exercício do catálogo, número de séries (1 ou mais), faixa com mínimo e
  máximo (mínimo ≤ máximo) e unidade **repetições** ou **segundos**; observação opcional.
- **Item de cardio**: modalidade (`esteira`, `bike`, `escada` ou `livre`), duração mínima e
  máxima em minutos (mínimo ≤ máximo); observação opcional.
- Um dia pode misturar itens de força e de cardio (ex.: musculação + 15 min de bike).
- Os valores da API são os deste contrato, em português (`rascunho`, `forca`, `repeticoes`,
  `esteira`…), seja qual for a forma guardada no banco.
- Na resposta, o item de força traz também `exercicioNome`, porque o aluno não vê o catálogo.
- O aluno lê a dele em `GET /minha-ficha`, que responde `{ ficha: Ficha | null }`: só a ativa;
  sem ativa, `ficha` vem nula (nunca rascunho nem arquivada).

**Formato**:

```text
ficha:     id, alunoId, professorId, nome, status (rascunho | ativa | arquivada), dias[]
dia:       rotulo (A, B, C…), titulo, ordem, itens[]
item:      ordem, tipo (forca | cardio), observacao?
  forca:   exercicioId, exercicioNome (só na resposta), series, faixaMin, faixaMax,
           unidade (repeticoes | segundos)
  cardio:  modalidade (esteira | bike | escada | livre), duracaoMinMin, duracaoMaxMin
```

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta. 2026-11-18 `002-fichas-treino`
— estado rascunho, arquivada só leitura, duplicar em rascunho, sem carga, tetos de 10 dias e 30
itens, mínimo só para ativar, `exercicioNome` na resposta, `GET /minha-ficha` com envelope e
valores em português.

## [C-02] Catálogo de exercícios

**Usado por**: `002` (produz), `003` (progressão por exercício), `006` (histórico por exercício).

**Regras**:

- Cada professor tem o próprio catálogo; o aluno só vê os exercícios que estão na ficha dele.
- Exercício tem nome (único no catálogo do professor, sem diferença de maiúsculas) e tipo de
  medida padrão (`repeticoes` ou `segundos`).
- Exercício tem só nome e unidade padrão (sem grupo muscular nem outros campos).
- O catálogo começa **vazio em produção**; exercícios de exemplo só no banco de desenvolvimento.
- Exercício usado em ficha ou sessão não é apagado: é desativado e some das novas escolhas.
- Exercício desativado que já está numa ficha continua aceito ao editar essa ficha e é copiado
  ao duplicá-la; escolha nova só aceita exercício ativo.

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta. 2026-11-18 `002-fichas-treino`
— catálogo vazio em produção, só nome e unidade padrão, desativado aceito na ficha que já o usa
e copiado ao duplicar.

## [C-03] Rotação: próximo dia

**Usado por**: `002` (define a ordem dos dias), `003` (calcula e mostra o próximo dia).

**Regras**:

- O próximo dia é o seguinte, na ordem da ficha ativa, ao dia da última sessão registrada nela;
  depois do último dia, volta ao primeiro.
- Sem sessão registrada na ficha ativa, o próximo é o primeiro dia.
- Dia perdido não vence nem acumula: o próximo continua sendo o seguinte ao último feito.
- O aluno pode registrar outro dia que não o sugerido; a rotação segue a partir do que foi
  registrado.

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta. 2026-11-18 `002-fichas-treino`
— sem mudança de regra; a `002` fixa a ordem dos dias (a ordem em que o professor os salva) que a
`003` usa.
