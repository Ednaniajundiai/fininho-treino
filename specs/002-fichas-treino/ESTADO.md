# Estado: 002-fichas-treino

**Gravado em**: 2026-11-18 | **Branch**: `002-fichas-treino` | **Último commit**: `54787b1` (revisão da História 1)
**Situação**: História 2 implementada e com gate verde, **não commitada** (aguarda revisão e o commit do dono)

## Onde parou

História 2 (T026–T032) pronta no working tree: `GET /api/minha-ficha` (aluno), OpenAPI e tipos
regenerados, tela `app/(app)/minha-ficha` e menu por papel. T033 só em parte: gate e e2e rodados,
este arquivo gravado; falta o commit da história com a prova (e a revisão por subagente).

## Prova

- Teste primeiro: `apps/api/test/minha-ficha.e2e-spec.ts` (10 casos); antes da rota, 9 falharam
  com 404 (rota inexistente); depois, 10 de 10 passam.
- `bash scripts/gate.sh`: lint (oxlint e eslint), typecheck (api e web) e 39 testes de unidade, verde.
- `pnpm --filter api test:e2e`: 11 arquivos, 111 testes passando (101 da US1 e da 001, mais 10).
- `pnpm --filter web build`: compila, com `/minha-ficha` na lista de rotas. `pnpm format:check`: limpo.
- T032: validação manual com contas fictícias `@exemplo.test` (apagadas do banco de dev ao fim,
  com ficha, exercícios e tokens de renovação); capturas 390px e 1280px, claro e escuro, fora do
  repositório.

## Decisões da História 2

- Resposta `200 { ficha: FichaDto | null }`: o envelope evita resposta sem corpo (o Nest manda
  `null` como corpo vazio). Registrar em `fichas/C-01` no T050.
- Controller próprio (`minha-ficha.controller.ts`), sem id na rota: o aluno vem do token.

## O que foi tentado e falhou

- Nada pendente.

## Em aberto

- Emenda do `constitution/stack.md` (Jest e ESLint para Vitest e oxlint) é do dono.
- Erros de formato do class-validator na API saem em inglês.
- Havia no banco de dev uma sessão antiga de um aluno fictício "Ari" no navegador embutido (de
  validação anterior); foi encerrada com "Sair". A conta não foi apagada (não é desta sessão).
- `design:accessibility-review` segue para o Polimento.

## Próximo passo

1. Revisão da História 2 por subagente (`revisao/US2.md`).
2. Commit da História 2 com a prova (fecha o T033).
3. História 3 (T034–T048).

## Ambiente

- Postgres de dev em 127.0.0.1:5450 (`fininho-treino-db-1`, da 001); pnpm fora do PATH do bash:
  `export PATH="$PATH:/c/Users/ednan/AppData/Roaming/npm"`; e2e recriam `fininho_treino_test`.
- Rodar um só arquivo e2e: `pnpm --filter api exec vitest run --config ./vitest.config.e2e.ts <arquivo>`
  (`pnpm --filter api test:e2e -- <arquivo>` roda a suíte inteira).
