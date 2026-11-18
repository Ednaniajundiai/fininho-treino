# Estado: 002-fichas-treino

**Gravado em**: 2026-11-18 | **Branch**: `002-fichas-treino` | **Último commit**: `81e9ed0` (revisão da História 2)
**Situação**: Histórias 1 e 2 commitadas e revisadas. História 3 implementada e com gate verde,
**não commitada** (aguarda revisão por subagente e o commit do dono)

## Onde parou

História 3 (T034–T047) pronta no working tree: `PUT /fichas/:id`, `POST /fichas/:id/arquivar`,
`POST /fichas/:id/duplicar`, `PATCH /exercicios/:id`, 409 em ficha arquivada, OpenAPI e tipos
regenerados, telas de edição, arquivar, duplicar e desativar exercício. T048 só em parte: gate e
e2e rodados, este arquivo gravado; falta o commit da história com a prova (e a revisão).

## Prova

- Teste primeiro: `apps/api/test/fichas-edicao.e2e-spec.ts` (27 casos) e 8 casos de `PATCH` em
  `exercicios.e2e-spec.ts`; antes da implementação falharam com 404 (rotas inexistentes). O caso de
  corrida no `POST` de criação falhou com 201 no código da US1 (a corrida existia). Removendo o
  `FOR SHARE`, os dois casos de corrida voltam a falhar (200/201): a trava é o que os faz passar.
- `bash scripts/gate.sh`: lint (oxlint e eslint), typecheck (api e web) e 40 testes de unidade, verde.
- `pnpm --filter api test:e2e`: 12 arquivos, 146 testes passando (111 da US1, US2 e 001, mais 35).
- `pnpm --filter web build`: compila, com `/fichas/[id]/editar` na lista de rotas.
  `pnpm format:check`: limpo.
- T047: validação manual com contas fictícias `@exemplo.test` (apagadas do banco de dev ao fim,
  com fichas, exercícios e tokens de renovação; sessões encerradas com "Sair"; servidores parados);
  capturas 390px e 1280px, claro e escuro, fora do repositório. Aviso "Você ainda não tem ficha"
  capturado nas 4 combinações (melhoria 4 da US2).

## Decisões da História 3

- Corrida desativar × salvar (melhoria 4 da US1): checagem de exercício dentro da transação de
  criar e de salvar, com `FOR SHARE` nos exercícios escolhidos.
- `PUT`, `ativar` e `arquivar` travam a ficha (`FOR UPDATE`) e leem o status depois da trava;
  arquivada responde 409 (FR-014; melhoria 1 da US1 resolvida).
- No `PUT`, exercício que a ficha já usa continua aceito mesmo desativado; escolha nova só de ativo.
- A cópia de `duplicar` nasce rascunho, com o mesmo nome, e leva os exercícios como estão.
- O status não muda pelo `PUT` (`ativar` no corpo é campo extra, 400).
- O teste da US2 que forçava "arquivada" por `updateMany` usa a rota real (melhoria 2 da US2).

## O que foi tentado e falhou

- Nada pendente.

## Em aberto

- Emenda do `constitution/stack.md` (Jest e ESLint para Vitest e oxlint) é do dono.
- Erros de formato do class-validator na API saem em inglês.
- No `PUT` da ficha ativa, a recusa reaproveita o texto "Para ativar, ..." da US1.
- Renomear e mudar a unidade padrão existem na API (`PATCH`), mas a tela do catálogo só tem
  Desativar/Reativar.
- `design:accessibility-review` segue para o Polimento.

## Próximo passo

1. Revisão da História 3 por subagente (`revisao/US3.md`).
2. Commit da História 3 com a prova (fecha o T048).
3. Polimento (T049–T055).

## Ambiente

- Postgres de dev em 127.0.0.1:5450 (`fininho-treino-db-1`, da 001); pnpm fora do PATH do bash:
  `export PATH="$PATH:/c/Users/ednan/AppData/Roaming/npm"`; e2e recriam `fininho_treino_test`.
- Rodar um só arquivo e2e: `pnpm --filter api exec vitest run --config ./vitest.config.e2e.ts <arquivo>`
  (`pnpm --filter api test:e2e -- <arquivo>` roda a suíte inteira).
