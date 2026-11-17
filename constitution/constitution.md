# Constituição do Projeto: fininho-treino

App de fichas de treino: o professor monta e atribui as fichas, o aluno vê a dele e registra a
sessão feita. Na conta do dono, a sessão registrada se cruza com o treino medido pelo relógio
(fininho-watch). Uso real pelo dono e vitrine pública de portfólio, com a stack escolhida de
propósito para aprender NestJS (decisão didática declarada em `stack.md`).

## Princípios de Arquitetura

### I. Todo dado tem dono, e a posse é checada no servidor (INEGOCIÁVEL)

Toda tabela de dado de usuário tem dono. O aluno só lê e altera o que é dele; o professor só os
alunos dele e o que pertence a esses alunos. A checagem acontece na API, em toda rota, nunca só
no front. Por quê: dado de saúde e de rotina pessoal. Violação: não há exceção; rota sem
checagem de posse é bug de segurança e bloqueia o merge.

### II. Nenhum dado real no repositório (INEGOCIÁVEL)

Seed, fixture, teste, exemplo, print e documentação usam só dados fictícios. A carga da ficha
real do dono roda por script local, com o arquivo de dados fora do Git. Por quê: o repositório é
público e o dado é de saúde. Violação: não há exceção; dado real commitado exige remover do
histórico e trocar o que vazou.

### III. O fininho-watch é só leitura e é opcional

O app só lê o fininho-watch (contrato em `specs/_sistema/fininho-watch.md`) e funciona sem ele:
se a integração estiver fora do ar, sem token ou sem dado no dia, a tela avisa e o resto segue.
Nada no app escreve no fininho-watch. Por quê: é outro sistema, com outro ciclo de vida.
Violação: registrar a exceção no plan da feature, com o motivo.

### IV. Nest idiomático e declarado

Um módulo por domínio; DTO validado na borda; regra de negócio em service, nunca em controller;
autenticação e papéis por guards e decorators (`@Public()`, `@Roles()`). Por quê: aprender o
NestJS como o mercado usa é o objetivo do projeto. Violação: registrar a exceção no plan, com o
ganho concreto.

### V. O contrato da API é a fonte

A API publica o contrato OpenAPI; o front consome tipos gerados dele e não decide regra de
negócio nem autorização (só esconde o que a API já negaria). Por quê: uma regra, um lugar.
Violação: registrar a exceção no plan da feature.

## Processo de Exceção

Qualquer desvio desta constituição em uma feature específica deve ser registrado explicitamente
no `spec.md` (ou `plan.md`) daquela feature, na seção "Exceções à Constituição", com a
justificativa. Um desvio não documentado é considerado um erro, não uma decisão. Princípios
INEGOCIÁVEIS não admitem exceção; mudá-los só por emenda.

## Partes desta constituição

| Arquivo | Conteúdo | Lido por |
|---|---|---|
| `constitution.md` (este) | princípios e processo de exceção | `trilho` (entrada), `trilho-plan`, `trilho-tasks`, `trilho-analise` |
| `stack.md` | stack de referência e restrições técnicas | `trilho-plan` |
| `workflow.md` | Definition of Done, segurança, commits e gates de PR | `trilho-tasks`, `trilho-implementar`, `trilho-analise` |
| `governance.md` | governança e histórico de emendas | só quem for emendar a constituição |

`trilho-spec` não lê a constituição de propósito: a spec descreve comportamento, sem tecnologia.

**Versão**: 1.0.0 | **Ratificada em**: 2026-11-17 | **Última alteração**: 2026-11-17
