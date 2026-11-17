# Tasks: Fichas de treino

**Input**: `specs/002-fichas-treino/spec.md` e `specs/002-fichas-treino/plan.md`

**Testes**: perfil Padrão (`constitution/workflow.md`). Uma tarefa de teste por cenário de regra;
toda rota nova tem e2e de 401, 403, 404 de outro dono e caminho feliz. Regras puras (validação da
ficha) em teste de unidade sem banco; e2e (`*.e2e-spec.ts`) rodam em `test:e2e` (marcador `lento`,
só na CI). FR-013 é `[sem teste: validação manual]`. Testes só com dados fictícios e nunca contra
banco de produção.

**Caminhos**: `apps/api/...` e `apps/web/...`. Comando por tarefa:
`pnpm --filter api test -- <caminho>`; fim da história: `scripts/gate.sh`.

## Fase 1: Setup

- [ ] T001 Conferir os nomes do plan (`users`, `teacher_id`, `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `PrismaService`) contra o código da 001 já na `main` e ajustar os nomes provisórios do plan/tasks se divergirem; registrar o resultado no topo deste arquivo (bloqueia a Fase 2)
- [ ] T002 [P] Adicionar `react-hook-form` e `zod` (e o resolver do shadcn Form) em `apps/web/package.json`, na versão estável atual

## Fase 2: Fundação (Bloqueante)

**CRÍTICO**: nenhuma história começa antes desta fase.

- [ ] T003 Modelar `exercises`, `plans`, `plan_days`, `plan_items` e enums (`REPS|SECONDS`, `DRAFT|ACTIVE|ARCHIVED`, `STRENGTH|CARDIO`, `TREADMILL|BIKE|STAIRS|FREE`) em `apps/api/prisma/schema.prisma` e gerar a migration em `apps/api/prisma/migrations/`, acrescentando à mão: único `(teacher_id, lower(name))`, único parcial `(student_id) WHERE status='ACTIVE'`, únicos `(plan_id, position)` e `(day_id, position)`, `CHECK` por tipo de item (depende de T001)
- [ ] T004 [P] Criar fixtures de e2e fictícias (professor A, professor B, aluno de A, aluno de B, tokens por papel) em `apps/api/test/helpers/fichas.ts`, reaproveitando os helpers de auth da 001 (depende de T001)
- [ ] T005 Criar os módulos vazios `ExerciciosModule` e `FichasModule` (controller/service/DTOs) e registrá-los em `apps/api/src/app.module.ts` (depende de T003)

**Checkpoint**: banco migrado, módulos registrados, fixtures prontas.

## Fase 3: História 1 - Professor cadastra exercícios e monta a ficha de um aluno (P1) MVP

**Objetivo**: catálogo, criação de ficha com dias e itens (força e cardio) e ativação.

**Teste Independente**: com professor e aluno vinculados, montar ficha A-E mista e conferir ordem gravada e status ativo.

**Arquivos**: `apps/api/prisma/seed.ts`, `apps/api/src/exercicios/*`, `apps/api/src/fichas/*` (controller, service, `ficha-validation.ts`, DTOs), `apps/api/src/fichas/*.spec.ts`, `apps/api/test/exercicios.e2e-spec.ts`, `apps/api/test/fichas.e2e-spec.ts`, `apps/web/app/exercicios`, `apps/web/app/fichas`, `apps/web/components/ficha/*`, `apps/web/lib/api/*`.

### Testes para a História 1 (escrever primeiro; devem falhar)

- [ ] T006 [P] [US1] Teste de unidade da validação pura: faixa mínima > máxima, séries < 1, cardio com mínimo > máximo (FR-004, cenário 4) em `apps/api/src/fichas/ficha-validation.spec.ts`
- [ ] T007 [P] [US1] Teste de unidade: ficha sem dia ou dia sem item não ativa; teto de 10 dias e 30 itens por dia (FR-005, cenário 5) em `apps/api/src/fichas/ficha-validation.spec.ts`
- [ ] T008 [P] [US1] Teste de unidade: rótulo do dia derivado da posição (A, B, C...) sem coluna, e dia com força e cardio misturados na ordem escolhida (FR-003, FR-004, FR-012, cenário 6) em `apps/api/src/fichas/ficha-validation.spec.ts`
- [ ] T009 [P] [US1] e2e do catálogo: `GET/POST /exercicios` com 401, 403 (aluno), caminho feliz com o exercício aparecendo no catálogo, e catálogo de A invisível para B (FR-001, FR-007, cenário 1) em `apps/api/test/exercicios.e2e-spec.ts`
- [ ] T010 [P] [US1] e2e: nome duplicado sem diferença de maiúsculas responde 409; o mesmo nome em dois professores é aceito (FR-002, cenário 2) em `apps/api/test/exercicios.e2e-spec.ts`
- [ ] T011 [P] [US1] e2e `POST /alunos/:alunoId/fichas`: 401, 403 (aluno), 404 (aluno de outro professor, cenário 7) e criação de ficha A-E com força e cardio ativa, lida de volta na ordem definida (FR-003, FR-004, FR-007, FR-012, cenários 3 e 6) em `apps/api/test/fichas.e2e-spec.ts`
- [ ] T012 [P] [US1] e2e: criação recusa (400) faixa invertida, séries < 1, ficha sem dia/dia sem item ao ativar, e exercício inativo ou do catálogo de outro professor (FR-004, FR-005, FR-011, cenários 4 e 5) em `apps/api/test/fichas.e2e-spec.ts`
- [ ] T013 [P] [US1] e2e `GET /alunos/:alunoId/fichas` e `GET /fichas/:id`: 401, 403, 404 de outro dono e caminho feliz (FR-007) em `apps/api/test/fichas.e2e-spec.ts`
- [ ] T014 [P] [US1] e2e `POST /fichas/:id/ativar`: 401, 403, 404 de outro dono; ativar arquiva a anterior do mesmo aluno, que continua legível (FR-006, FR-007) em `apps/api/test/fichas.e2e-spec.ts`
- [ ] T015 [P] [US1] e2e `lento`: migration do zero, `CHECK` por tipo de item recusa linha inconsistente, e duas ativações simultâneas deixam uma só ficha ativa (índice parcial) (FR-004, FR-006) em `apps/api/test/fichas-db.e2e-spec.ts`

### Implementação da História 1

- [ ] T016 [US1] Implementar a validação pura (faixas, séries, ao menos 1 dia/item, tetos, derivação do rótulo) em `apps/api/src/fichas/ficha-validation.ts` (faz T006-T008 passarem)
- [ ] T017 [P] [US1] Implementar `ExerciciosController`/`ExerciciosService` (`GET`, `POST`, 409 em duplicidade, posse por `teacher_id`) e DTOs com `class-validator` e Swagger em `apps/api/src/exercicios/` (faz T009 e T010 passarem; depende de T005)
- [ ] T018 [US1] Implementar DTOs de ficha (dias e itens, força e cardio) em `apps/api/src/fichas/dto/` e `FichasService.criar/listarPorAluno/obter` (rascunho ou já ativa, só exercício ativo do próprio professor, posse no service) em `apps/api/src/fichas/fichas.service.ts` (depende de T016, T017)
- [ ] T019 [US1] Implementar `ativar` em transação (arquiva a ativa do aluno e ativa esta) e o `FichasController` com `@Roles(PROFESSOR)` e Swagger (`POST/GET /alunos/:alunoId/fichas`, `GET /fichas/:id`, `POST /fichas/:id/ativar`) em `apps/api/src/fichas/fichas.controller.ts` (depende de T018; faz T011-T015 passarem)
- [ ] T020 [P] [US1] Seed de desenvolvimento com exercícios genéricos fictícios em `apps/api/prisma/seed.ts` (depende de T003)
- [ ] T021 [US1] Regenerar os tipos do cliente a partir do OpenAPI em `apps/web/lib/api/` (depende de T019)
- [ ] T022 [P] [US1] Tela do catálogo de exercícios (lista, criar, mensagem de duplicidade) em `apps/web/app/exercicios/` (depende de T021, T002)
- [ ] T023 [US1] Lista de alunos, fichas do aluno e editor com `useFieldArray` (dias e itens de força/cardio, ordem, ativar), validação espelhando o servidor, em `apps/web/app/fichas/` e `apps/web/components/ficha/` (depende de T021, T002)
- [ ] T024 [US1] Validação manual de FR-013: formulários e ficha em português e usáveis no celular; captura 390px e 1280px, claro e escuro, conferida contra `~/.claude/DESIGN.base.md` (depende de T022, T023)
- [ ] T025 [US1] Rodar `scripts/gate.sh` e commitar a história 1 com a prova (depende de T006-T024)

**Checkpoint**: professor monta e ativa uma ficha A-E completa; história 1 testável sozinha.

---

## Fase 4: História 2 - Aluno vê a ficha ativa (P2)

**Objetivo**: o aluno lê só a ficha ativa dele, como prescrita.

**Teste Independente**: com ficha ativa, entrar como o aluno e conferir igualdade com o prescrito; entrar como outro aluno e não ver nada dela.

**Arquivos**: `apps/api/src/fichas/minha-ficha.controller.ts` (ou rota no `FichasController`), `apps/api/src/fichas/fichas.service.ts`, `apps/api/test/minha-ficha.e2e-spec.ts`, `apps/web/app/minha-ficha/`, `apps/web/lib/api/*`.

### Testes para a História 2 (escrever primeiro)

- [ ] T026 [P] [US2] e2e `GET /minha-ficha`: 401, 403 (professor), e o aluno recebe dias e itens iguais ao prescrito, na ordem, sem campos de outros alunos (FR-008, cenário 1) em `apps/api/test/minha-ficha.e2e-spec.ts`
- [ ] T027 [P] [US2] e2e: aluno sem ficha ativa recebe vazio; ficha `DRAFT` ou arquivada nunca é devolvida (FR-008, FR-006, cenário 2) em `apps/api/test/minha-ficha.e2e-spec.ts`
- [ ] T028 [P] [US2] e2e: aluno B não vê a ficha de A em `/minha-ficha`, e aluno acessando `GET /fichas/:id`, `POST /alunos/:alunoId/fichas` ou `POST /fichas/:id/ativar` recebe 403 (rotas da US1; o 403 do `PUT` fica em T034, pois a rota só nasce na US3) (FR-007, FR-008, cenários 3 e 4) em `apps/api/test/minha-ficha.e2e-spec.ts`

### Implementação da História 2

- [ ] T029 [US2] Implementar `GET /minha-ficha` com `@Roles(ALUNO)`, filtrando por `student_id` do token e `status = ACTIVE`, em `apps/api/src/fichas/` (faz T026-T028 passarem; depende de T019)
- [ ] T030 [US2] Regenerar os tipos do cliente em `apps/web/lib/api/` (depende de T029)
- [ ] T031 [US2] Tela do aluno com dias, itens (séries, faixa, unidade; modalidade e duração), observações e aviso de "ainda não há ficha" em `apps/web/app/minha-ficha/` (depende de T030)
- [ ] T032 [US2] Validação manual de FR-013 na tela do aluno: português, celular; captura 390px e 1280px, claro e escuro, contra `~/.claude/DESIGN.base.md` (depende de T031)
- [ ] T033 [US2] Rodar `scripts/gate.sh` e commitar a história 2 com a prova (depende de T026-T032)

**Checkpoint**: aluno vê a ficha ativa dele e nunca a de outro.

---

## Fase 5: História 3 - Professor edita, arquiva, troca e duplica a ficha (P3)

**Objetivo**: manutenção da ficha no dia a dia e desativação de exercício.

**Teste Independente**: editar ficha ativa e ver o aluno receber o valor novo; ativar outra e ver a anterior arquivada.

**Arquivos**: `apps/api/src/fichas/*` (service, controller, duplicação), `apps/api/src/exercicios/*` (`PATCH`), `apps/api/test/fichas-edicao.e2e-spec.ts`, `apps/api/test/exercicios.e2e-spec.ts`, `apps/api/src/fichas/ficha-validation.spec.ts`, `apps/web/app/fichas/`, `apps/web/app/exercicios/`, `apps/web/components/ficha/*`, `apps/web/lib/api/*`.

### Testes para a História 3 (escrever primeiro)

- [ ] T034 [P] [US3] e2e `PUT /fichas/:id`: 401, 403, 404 de outro dono; edição das séries de um item na ficha ativa aparece em `GET /minha-ficha` do aluno (FR-009, FR-007, cenário 1) em `apps/api/test/fichas-edicao.e2e-spec.ts`
- [ ] T035 [P] [US3] e2e: `PUT` recusa (400) mais de 10 dias, mais de 30 itens num dia, remover o último item de um dia e o último dia de ficha ativa (FR-005, cenário 6) em `apps/api/test/fichas-edicao.e2e-spec.ts`
- [ ] T036 [P] [US3] Teste de unidade: rótulos continuam A, B, C... em sequência ao reordenar ou remover dias (FR-012) em `apps/api/src/fichas/ficha-validation.spec.ts`
- [ ] T037 [P] [US3] e2e `POST /fichas/:id/arquivar`: 401, 403, 404 de outro dono; arquivar a ativa sem ativar outra deixa o aluno sem ficha em `GET /minha-ficha` (FR-010, FR-006, FR-008) em `apps/api/test/fichas-edicao.e2e-spec.ts`
- [ ] T038 [P] [US3] e2e: ficha arquivada fica só leitura: `PUT`, `ativar` e `arquivar` respondem 409, `GET` continua legível, e a anterior arquivada por troca (cenário 2) segue legível (FR-014, FR-006, cenários 2 e 5) em `apps/api/test/fichas-edicao.e2e-spec.ts`
- [ ] T039 [P] [US3] e2e `POST /fichas/:id/duplicar`: 401, 403, 404 (ficha de outro dono e `alunoId` de destino de outro professor); duplicar para o mesmo aluno e para outro gera ficha nova e independente (editar a cópia não altera a original) com os mesmos dias e itens (FR-010, FR-007, cenário 3) em `apps/api/test/fichas-edicao.e2e-spec.ts`
- [ ] T040 [P] [US3] e2e `PATCH /exercicios/:id`: 401, 403, 404 de outro dono; desativar exercício em uso o tira das novas escolhas (criar item com ele é recusado) e ele continua na ficha existente e em `GET /minha-ficha` (FR-011, FR-007, cenário 4) em `apps/api/test/exercicios.e2e-spec.ts`

### Implementação da História 3

- [ ] T041 [US3] Implementar `FichasService.atualizar` (`PUT` substitui dias e itens numa transação, só ficha ativa ou rascunho, 409 em arquivada, tetos e mínimos) e a rota em `apps/api/src/fichas/` (faz T034, T035, T036 passarem; depende de T019)
- [ ] T042 [US3] Implementar `arquivar` e o bloqueio de arquivada (409 em `ativar`/`PUT`/`arquivar`) em `apps/api/src/fichas/` (faz T037, T038 passarem; depende de T041)
- [ ] T043 [US3] Implementar `duplicar` (ficha nova independente, `alunoId` de destino do próprio professor) em `apps/api/src/fichas/duplicacao.ts` e a rota (faz T039 passar; depende de T041)
- [ ] T044 [P] [US3] Implementar `PATCH /exercicios/:id` (renomear, unidade padrão, desativar/reativar, nunca apagar) em `apps/api/src/exercicios/` (faz T040 passar; depende de T017)
- [ ] T045 [US3] Regenerar os tipos do cliente em `apps/web/lib/api/` (depende de T042, T043, T044)
- [ ] T046 [US3] Telas de edição da ficha, arquivar, trocar a ativa e duplicar (escolha do aluno de destino) em `apps/web/app/fichas/` e `apps/web/components/ficha/`, e desativar/reativar exercício em `apps/web/app/exercicios/` (depende de T045)
- [ ] T047 [US3] Validação manual de FR-013 nas telas de edição: português, celular; captura 390px e 1280px, claro e escuro, contra `~/.claude/DESIGN.base.md` (depende de T046)
- [ ] T048 [US3] Rodar `scripts/gate.sh` e commitar a história 3 com a prova (depende de T034-T047)

**Checkpoint**: ciclo completo de manutenção da ficha funcionando.

---

## Fase 6: Polimento e Preocupações Transversais

- [ ] T049 [P] Atualizar documentação afetada: `specs/BOARD.md` (corrigir a menção a "carga" na ficha) e README/mapa do código das linhas de `fichas`
- [ ] T050 Aplicar "Contratos tocados" em `specs/_sistema/` (`fichas/C-01`, `fichas/C-02`, `fichas/C-03`, conforme a seção da spec; `autenticacao/C-01` só consumido)
- [ ] T051 Checagem de segurança: nenhuma rota de `fichas`/`exercicios` sem `@Roles()`; posse por `teacher_id` em toda consulta; log sem dado de treino em texto; seed, fixtures e prints só fictícios (princípios I e II)
- [ ] T052 Revisar cobertura de teste contra FR-001 a FR-014 (FR-013 por validação manual) e apagar teste duplicado ou que não testa comportamento
- [ ] T053 Escrever o plano de desfazer da migration (Prisma não gera `down`) para a descrição da PR e documentar variáveis novas, se houver, em `.env.example`
- [ ] T054 Gravar `specs/002-fichas-treino/retro.md`
- [ ] T055 Rodar os gates de PR do `constitution/workflow.md` (`pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, `pnpm --filter api test:e2e`, `pnpm -r build`, sem `console.log`) e o `scripts/gate.sh` (depende de T025, T033, T048, T049-T054)

## Dependências e Ordem de Execução

- Setup (T001-T002) -> Fundação (T003-T005, bloqueia as histórias).
- US1 (P1) -> US2 (P2) e US3 (P3) dependem do `ativar` e do `FichasService` da US1 (T019); US2 e US3 tocam arquivos em comum (`apps/api/src/fichas/`, `apps/web/lib/api/`), então rodam em sequência: uma história por vez, conforme o workflow.
- Dentro de cada história: testes primeiro (falham), depois implementação, depois front, validação manual, gate e commit.
- Polimento (T049-T055) depende das três histórias.
- Uma feature em implementação por vez; a 002 só entra em implementação com a 001 na `main` (T001).

## Notas

- Teste de migration e de concorrência (T015) leva o marcador `lento` (roda só na CI).
- Se a 003 passar a referenciar itens da ficha, revisar D-02 (`PUT` troca ids de dia e item).
- `DRAFT` é estado extra além do contrato; aprovado pelo dono em 2026-11-17 (registrar em `fichas/C-01` no T050). A cópia de `duplicar` nasce `DRAFT`.
