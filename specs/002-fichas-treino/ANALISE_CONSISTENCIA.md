# Análise de consistência: 002-fichas-treino (rodadas 1 e 2 de 2)

**Veredito final**: PRONTO PARA IMPLEMENTAR — o único bloqueante da rodada 1 está resolvido no `tasks.md` commitado (50dde05) e a rodada 2 não achou bloqueante novo.

**Rodada 1** · commit analisado: `46042ca2943ee456dcc8e20064773eded26958b7` (o `tasks.md` ainda não estava commitado) · constituição: `constitution/` (perfil Padrão).

## Bloqueantes

1. **[Contradição entre tarefas, Fase 3] T028 (US2) exigia 403 em `PUT /fichas/:id`, rota que só nasce em T041 (US3).** O gate da história 2 (T033) não passaria, pois T029 "faz T026-T028 passarem". **Corrigido** em `tasks.md`: `PUT` saiu de T028; o 403 do `PUT` já está em T034. FR-007 continua coberto. **Confirmado resolvido na rodada 2.**

## Melhorias (8; 4 resolvidas em 50dde05, 4 abertas e não bloqueantes)

1. **[ABERTA, vai para T050] [CONTRATO DIVERGENTE, leve] `DRAFT`.** O plan (linhas 119-121) acrescenta o status `DRAFT`, mas a spec diz que `fichas/C-01` está "sem mudança de formato" e o contrato só tem `ativa | arquivada`. Aprovado pelo dono e contido na API; mas T050 deve registrar `DRAFT` em `fichas/C-01` (ou a spec, em emenda, dizer que o formato muda).
2. **[RESOLVIDA em 50dde05] Nota obsoleta de `DRAFT`.** `tasks.md` (Notas) e `plan.md` (Riscos) ainda dizem "confirmar ou remover"; o dono já aprovou. Remover a pendência.
3. **[RESOLVIDA em 50dde05] Status da cópia em `duplicar` (D-06, T043, T039) não definido.** Se a cópia nascer `ACTIVE` para um aluno que já tem ficha ativa, arquiva a existente sem aviso. Definir (sugestão: nasce `DRAFT`) e testar em T039.
4. **[ABERTA, vai para T001] [DESVIO NÃO REGISTRADO, leve] Vitest/oxlint.** `constitution/stack.md` e `workflow.md` falam em Jest; a exceção (commit `d551983`) existe só na branch `001-contas-acesso`, fora desta branch. O plan a cita como herdada (a constituição pede registro no plan), mas a spec diz "sem exceções". T001 deve conferir que a exceção chegou à `main` e que `stack.md`/`workflow.md` batem (inclusive o "marcador `lento` (Jest)").
5. **[RESOLVIDA em 50dde05, plan agora ADEQUADO] [VEREDITO QUESTIONÁVEL]** ENXUTO com 55 tarefas para 14 FRs (média 3,9, acima do alerta de 3 por FR, que o plan mandou medir no tasks). Boa parte é e2e de 401/403/404 exigido pelo workflow; considerar ADEQUADO.
6. **[RESOLVIDA em 50dde05] Cenário H2.3 da spec ("não encontrado") x plan.** O aluno não tem rota por id; em `GET /fichas/:id` recebe 403 (papel). O 404 só vale para `/minha-ficha` nunca expor ficha alheia. Esclarecer o cenário na spec (reporte; não alterado).
7. **[ABERTA, leve] Dependência fora do plan.** T002 inclui o resolver do shadcn Form (`@hookform/resolvers`); o plan só cita `react-hook-form` e `zod`.
8. **[ABERTA, leve] T012 (US1) pede exercício inativo**, mas `PATCH /exercicios/:id` só entra em T044 (US3). Dizer em T012 que o inativo é criado direto no banco pela fixture.

## Verificações feitas (limpas)

- `rastrear.sh` travou (timeout de 60 s, após as seções FR_SEM_TAREFA, FR_SEM_TESTE, IDS_DUPLICADOS e DEPENDENCIA_INVALIDA, todas vazias). O restante foi feito à mão.
- Todo FR tem tarefa e teste: FR-001 T009 · 002 T010 · 003 T008/T011 · 004 T006/T011/T012 · 005 T007/T012/T035 · 006 T014 · 007 T009/T011/T013/T028 · 008 T026/T027 · 009 T034 · 010 T037/T039 · 011 T012/T040 · 012 T008/T036 · 014 T038. FR-013 com `[sem teste]` legítimo (tela).
- Cenários de aceite H1 (1-7), H2 (1-4), H3 (1-6) mapeiam para tarefas de teste; as dispensas de teste são só de tela.
- Dependências entre tarefas válidas (fora o item bloqueante), sem ID duplicado, toda história com fase.
- Entidades da spec (Exercício, Ficha, Dia, Item) estão no modelo de dados do plan; nenhuma tarefa cria entidade fora dele.
- Constituição: princípios I, II, IV, V tratados; tarefa de segurança (T051); decisões todas com "Decidida por"; seção Proporção presente.
- Contratos: `fichas/C-01`, `C-02`, `C-03` existem em `_sistema/`; T050 os aplica na fase final; `autenticacao/C-01` (404 para dono alheio, 403 para papel) consumido como no contrato.
- `BOARD.md` ainda cita "carga" (T049 corrige, como a spec decidiu).

## Limitações

- A 001 não tem código nem está na `main`; os nomes provisórios (`users`, `teacher_id`, guards) ficam para T001. `sessoes.md` só consultado para consistência de C-01 (a 002 não o consome).
- `ARQUITETURA_DO_SISTEMA.md` não existe; sem contexto de código.
- A seção informativa `PROPORCAO` do script não rodou; a contagem de tarefas é manual.

## Rodada 2

**Escopo**: só o bloqueante da rodada 1, contra o `tasks.md` commitado (HEAD 50dde05), mais conferência de relance das edições desse commit (plan, spec, tasks).

**Bloqueante 1 (T028 x PUT): RESOLVIDO.**
- T028 (US2) agora cobre `GET /minha-ficha` do aluno B, e 403 do aluno em `GET /fichas/:id`, `POST /alunos/:alunoId/fichas` e `POST /fichas/:id/ativar`, todas rotas da US1 (T019). Não depende mais de rota de história posterior.
- O 403 de `PUT /fichas/:id` está em T034 (US3, mesma história de T041, que cria a rota). FR-007 segue coberto.

**Edições de 50dde05, sem contradição nova:**
- plan: veredito ADEQUADO com a contagem de 55 tarefas para 14 FRs; `DRAFT` aprovado, cópia de `duplicar` nasce `DRAFT`. Bate com a nota final do `tasks.md`.
- spec: cenário H2.3 reescrito (aluno B vê só a dele; sem rota por id; 403 nas rotas do professor). Consistente com T028 e com `autenticacao` (403 por papel).
- tasks: nota de `DRAFT`/`duplicar` alinhada ao plan. T039 ainda não afirma o status da cópia (melhoria 3 resolvida no texto do plan e na nota; testar `DRAFT` em T039 é opcional).
- `specs/_sistema/fichas.md` segue só com `ativa | arquivada`; a divergência já está tratada (melhoria 1, T050). Nenhum conflito novo.

**Bloqueantes novos**: nenhum. Fim das rodadas (limite de 2).

## Rodada 3 (pós-merge da 001, foco em autenticação)

**Escopo**: FR-007, FR-008 e as tarefas de rota, posse e e2e de autorização contra `specs/_sistema/autenticacao.md` (C-01 a C-03 atualizados) e o código real da 001 em `apps/api`. **Veredito: PRONTO** (nenhum bloqueante que exija mudar spec ou plan).

### Bloqueantes (3, todos mecânicos e corrigidos no `tasks.md`)

1. **T004 apontava `apps/api/test/helpers/fichas.ts`, e a pasta `helpers` não existe.** Os helpers reais estão em `apps/api/test/apoio.ts` (`subirApp`, `limparBanco`, `criarProfessor`, `entrar`, `novaOrigem`). Pior: o aluno nasce com senha provisória e, pelo C-02, recebe 403 em qualquer rota nova até trocar a senha; sem a fixture trocar a senha, todo e2e de aluno (T026-T028) falharia por motivo errado. **Corrigido**: T004 vira `test/apoio-fichas.ts`, importa de `apoio.ts`, entrega o aluno já com senha trocada (`POST /api/auth/trocar-senha`) e uma variante ainda provisória.
2. **`@Roles(PROFESSOR)` / `@Roles(ALUNO)` (T019, T029) não compilam.** O decorator real recebe strings (`@Roles('PROFESSOR')`) e o id vem de `@UsuarioAtual()`. **Corrigido** nas duas tarefas.
3. **T020 pressupunha `apps/api/prisma/seed.ts` e a 001 não deixou seed nem configuração.** Em Prisma 7 o seed se registra em `migrations.seed` de `apps/api/prisma7.config.ts`. **Corrigido** em T020. (T021/T030/T045 também mandavam regenerar só `lib/api`; o fluxo real é `pnpm gen:api`, que atualiza `apps/api/openapi.json` e `apps/web/lib/api/schema.d.ts`. Corrigido.)

### Melhorias (4, aplicadas no `tasks.md`)

1. **Senha provisória negada por padrão**: confirmado no código (`SenhaProvisoriaGuard` global, depois do `JwtAuthGuard` e antes do `RolesGuard`; falha fechada se o token não tiver `mcp`). Faltava teste: T026 agora exige 403 para aluno com senha provisória em `GET /minha-ficha` (e 401 com token inválido); T051 exige que nenhuma rota de `fichas`/`exercicios` tenha `@PermiteSenhaProvisoria()` ou `@Public()`.
2. **404 de `POST /alunos/:alunoId/fichas`** (T011): agora cobre aluno de outro professor, id inexistente e id de um professor (a posse deve filtrar `role = 'ALUNO'` e `teacherId`, como o `UsuariosService`).
3. **O gate não roda e2e** (`scripts/gate.sh`: lint, tipos e unidade), e toda a cobertura 401/403/404 está em e2e. Cabeçalho do `tasks.md` e T025/T033/T048 passam a exigir `pnpm --filter api test:e2e` antes de cada commit de história; o comando por tarefa para e2e é `test:e2e -- <caminho>` (o `test` não os inclui).
4. **Retro da 001**: (a) gravar `ESTADO.md` ao fim de cada história entrou em T025/T033/T048; (b) o risco do token de acesso válido por até 15 min depois de redefinição de senha entrou em T051 (para a retro da 002), aceito sem teste de revogação imediata, como diz o C-03.

### Conferido sem divergência

- T001 pré-conferido (registrado na própria tarefa): `users`/`User`, `teacherId` com `@map("teacher_id")`, `Role` `PROFESSOR|ALUNO`, guards globais, `PrismaService` global, Vitest e oxlint. `limparBanco` faz `TRUNCATE users CASCADE`, então as FKs novas para `users` limpam junto. O `AlunosController` (em `src/usuarios/`, não `src/alunos/`) é o padrão de `@Roles` na classe e posse no service.
- Cobertura 401/403/404: toda rota nova com id tem 404 de outro dono (T011, T013, T014, T034, T037, T039, T040); `GET/POST /exercicios` e `GET /minha-ficha` não têm id, logo sem 404 (correto pelo C-01: `/minha-ficha` filtra pelo id do token).
- C-03 (claim `mcp`, mesma origem, logout público) não toca rotas da 002.

### Exige mudança em spec ou plan (não alterados; nenhum bloqueia)

- **plan** (linhas 13 e 65): os "nomes provisórios" já têm resposta (T001 pré-conferido); pode trocar por "conferidos na 001".
- **plan/spec** (Riscos): acrescentar o risco herdado da 001 (token de acesso do aluno vale até 15 min depois de redefinição de senha; aceito, é leitura da própria ficha).
- **`constitution/stack.md` e `workflow.md`** ainda dizem Jest/ESLint (emenda pendente da 001, citada na retro); T001 cobre a conferência, a emenda é do dono.
