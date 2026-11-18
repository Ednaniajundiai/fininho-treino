# Tasks: Contas e acesso

**Input**: `specs/001-contas-acesso/spec.md` e `specs/001-contas-acesso/plan.md`

**Testes**: perfil Padrão. Uma tarefa de teste por cenário de regra; caso extra só onde o plan
declara risco (rotação e reuso do token, posse do dado, migration). Os arquivos `*.e2e-spec.ts`
levam o marcador `lento`: usam o Postgres de teste, ficam fora do gate rápido e rodam em
`pnpm --filter api test:e2e` (local sob demanda e sempre na CI). FR-001, FR-002 e FR-020 são
`[sem teste]` na spec: ganham validação manual.

**Organização**: por história. A base do repositório (Setup e Fundação) é pré-requisito da
História 1 e entra no commit dela.

## Formato: `[ID] [P?] [História] Descrição`

## Fase 1: Setup (Infraestrutura Compartilhada)

- [x] T001 Ativar o pnpm via `corepack` e conferir a versão do Node contra o `engines` do Prisma 7.10.1; registrar o resultado no `ESTADO.md` se bloquear (D-07)
- [x] T002 Criar a raiz do monorepo: `package.json` (scripts `dev`, `lint`, `typecheck`, `test`, `build`, `format`, `packageManager`), `pnpm-workspace.yaml`, `.nvmrc`, `.env.example` (depende de T001)
- [x] T003 Criar `apps/api` com NestJS 12, TypeScript `strict`, Vitest, padrão do esqueleto (D-15; script `test` só unidade, `test:e2e` para `*.e2e-spec.ts`) (depende de T002)
- [x] T004 [P] Criar `apps/web` com Next.js (App Router), Tailwind, shadcn/ui com os tokens do `~/.claude/DESIGN.base.md` e TanStack Query (depende de T002)
- [x] T005 [P] Configurar lint (oxlint na API, ESLint do Next no front) e Prettier compartilhado na raiz, com `lint` e `typecheck` em cada app (depende de T003, T004)
- [x] T006 [P] Criar `docker-compose.yml` (Postgres com volume) e `scripts/postgres-init.sql` (cria o banco `fininho_treino_test`) (FR-001)

## Fase 2: Fundação (Bloqueante)

- [x] T007 Configurar o Prisma 7.10.1 em `apps/api` (`prisma/schema.prisma`, `PrismaModule`, `PrismaService` em `apps/api/src/prisma/`), conferindo configuração e adaptador na doc oficial (depende de T003, T006)
- [x] T008 Modelar `users` e `refresh_tokens` em `apps/api/prisma/schema.prisma` e gerar a primeira migration, com o `CHECK` de aluno/professor escrito à mão (D-01, D-12, D-13) (depende de T007)
- [x] T009 Montar `apps/api/src/main.ts` e `app.module.ts`: prefixo `/api`, `ValidationPipe` global com `whitelist`, `cookie-parser`, `trust proxy`, `ConfigModule` com validação das variáveis, Swagger em `/api/docs` (depende de T007)
- [x] T010 Criar o suporte de e2e em `apps/api/test/`: `globalSetup` que aplica as migrations do zero no banco de teste (`lento`), utilitário de limpeza das tabelas, fábricas de contas fictícias `*@exemplo.test` e um teste e2e de que o banco recusa aluno sem professor e professor com professor (`apps/api/test/migration.e2e-spec.ts`) (depende de T008, T009)
- [x] T011 [P] Criar `.github/workflows/ci.yml`: Node 24, Postgres como service container, lint, formatação, tipos, unidade, e2e, build e a checagem de deriva do OpenAPI (FR-002, D-14) (depende de T005)

**Checkpoint**: `docker compose up -d`, migration aplicada, API sobe e a suíte vazia passa.

## Fase 3: História de Usuário 1 - O dono cria a conta de professor e entra (Prioridade: P1) 🎯 MVP

**Objetivo**: comando de CLI cria o professor; login, renovação, logout e guard global.

**Teste Independente**: ambiente limpo, subir, rodar o comando, entrar pela tela, recarregar,
sair.

**Arquivos**: tudo das Fases 1 e 2; `apps/api/src/{health,auth,usuarios,cli}`,
`apps/api/test/{health,auth,cli}.e2e-spec.ts`, `apps/web/app/(auth)/entrar`,
`apps/web/app/(app)/page.tsx`, `apps/web/lib/api/`, `apps/web/next.config.ts`, `README.md`.

### Testes para a História 1 ⚠️

- [x] T012 [P] [US1] Teste de unidade: normalização de e-mail e política de senha (8 a 128) em `apps/api/src/usuarios/senha.spec.ts` e `email.spec.ts` (FR-014, FR-018)
- [x] T013 [P] [US1] Teste de unidade: decisão da rotação (válido, vencido, já usado, revogado) e hash do token em `apps/api/src/auth/tokens.spec.ts` (FR-007, FR-008)
- [x] T014 [P] [US1] Teste de unidade: `JwtAuthGuard` nega sem token, com token inválido e vencido, e libera `@Public()` em `apps/api/src/auth/guards/jwt-auth.guard.spec.ts` (FR-010)
- [x] T015 [P] [US1] Teste e2e (`lento`): CLI cria professor com senha definitiva (cenário 1); recusa professor existente sem `--redefinir`; com `--redefinir` troca a senha e derruba as sessões (cenário 2); recusa e-mail de aluno, em `apps/api/test/cli.e2e-spec.ts` (FR-003, FR-004)
- [x] T016 [P] [US1] Teste e2e (`lento`): login correto devolve token e conta (cenário 3); e-mail inexistente e senha errada dão a mesma resposta (cenário 4); a senha e o hash nunca aparecem na resposta e o hash gravado é argon2id, em `apps/api/test/auth-login.e2e-spec.ts` (FR-005, FR-019)
- [x] T017 [P] [US1] Teste e2e (`lento`): 6ª tentativa de login em um minuto recebe 429 e a conta não fica bloqueada: a mesma conta entra a partir de outra origem (cenário 5), em `apps/api/test/auth-login.e2e-spec.ts` (FR-006)
- [x] T018 [P] [US1] Teste e2e (`lento`): renovação gira o token e o anterior deixa de valer (cenário 6); token vencido dá 401; reuso de token girado derruba a família inteira e não outra família (cenário 8); atributos do cookie (`httpOnly`, `Secure`, `SameSite=Strict`, `Path`), em `apps/api/test/auth-sessao.e2e-spec.ts` (FR-007, FR-008)
- [x] T019 [P] [US1] Teste e2e (`lento`): logout revoga só a sessão do aparelho e a outra segue renovando (cenário 7); o logout funciona só com o cookie, sem token de acesso, e sem cookie responde sem erro e sem efeito, em `apps/api/test/auth-sessao.e2e-spec.ts` (FR-009, FR-010)
- [x] T020 [P] [US1] Teste e2e (`lento`): `GET /api/health` responde sem token; `GET /api/auth/me` dá 401 sem token e com token inválido, e devolve a conta com token válido (cenário 9), em `apps/api/test/health.e2e-spec.ts` e `auth-me.e2e-spec.ts` (FR-010, FR-011)

### Implementação da História 1

- [x] T021 [P] [US1] `HealthModule` com `GET /health` pública em `apps/api/src/health/` (FR-001)
- [x] T022 [US1] `apps/api/src/usuarios/`: normalização de e-mail, política de senha, hash argon2id e `UsuariosService.criarProfessor` / `redefinirSenhaProfessor` (depende de T008)
- [x] T023 [US1] `apps/api/src/auth/`: emissão do JWT, token de renovação opaco com SHA-256, rotação atômica e revogação por família (`tokens.service.ts`) (depende de T008)
- [x] T024 [US1] `AuthService` e `AuthController`: `login` (com verificação argon2 de equalização e `@Throttle`), `refresh`, `logout`, `me`, DTOs com Swagger (depende de T022, T023)
- [x] T025 [US1] Decorators `@Public()`, `@Roles()`, `@UsuarioAtual()` e os guards globais `ThrottlerGuard`, `JwtAuthGuard` e `RolesGuard` registrados em `app.module.ts` (depende de T024)
- [x] T026 [US1] CLI `apps/api/src/cli/criar-professor.ts` com leitura da senha sem eco e `--redefinir`, e o script `cli` no `package.json` da API (depende de T022)
- [x] T027 [US1] Script `apps/api/src/openapi.ts` que grava `apps/api/openapi.json`, e geração dos tipos em `apps/web/lib/api/schema.d.ts` (`pnpm gen:api`) (depende de T024)
- [x] T028 [US1] Front: rewrite de `/api` em `apps/web/next.config.ts`, cliente `openapi-fetch`, sessão em memória com renovação single-flight em `apps/web/lib/api/` (depende de T027)
- [x] T029 [US1] Front: tela `apps/web/app/(auth)/entrar`, layout protegido `app/(app)/` com a inicial de professor e o botão de sair (FR-020) (depende de T028)
- [x] T030 [US1] `README.md`: comandos do clone ao primeiro login (FR-001, SC-001)
- [x] T031 [US1] Validação manual: roteiro do teste independente no navegador e capturas da tela de entrar e da inicial (390px e 1280px, claro e escuro) contra o `DESIGN.base.md` (FR-020)

**Checkpoint**: História 1 funcional; gate e e2e verdes.

---

## Fase 4: História de Usuário 2 - O professor cria e acompanha as contas dos alunos (Prioridade: P2)

**Objetivo**: criar aluno com provisória gerada, listar os próprios alunos, redefinir a senha.

**Teste Independente**: como professor, criar aluno, ver a provisória uma vez e o aluno na
lista; um segundo professor não vê nem altera esse aluno.

**Arquivos**: `apps/api/src/usuarios/` (alunos controller, service, DTOs, geração da
provisória), `apps/api/test/alunos.e2e-spec.ts`, `apps/web/app/(app)/alunos`,
`apps/api/openapi.json`, `apps/web/lib/api/schema.d.ts`.

### Testes para a História 2 ⚠️

- [ ] T032 [P] [US2] Teste de unidade: a senha provisória gerada cumpre a política e não se repete, em `apps/api/src/usuarios/senha-provisoria.spec.ts` (FR-013)
- [ ] T033 [P] [US2] Teste e2e (`lento`): professor cria aluno vinculado a ele e recebe a provisória uma vez; o aluno entra com ela; a provisória não aparece na listagem (cenário 1), em `apps/api/test/alunos.e2e-spec.ts` (FR-012, FR-013, FR-019)
- [ ] T034 [P] [US2] Teste e2e (`lento`): e-mail já usado, com outra caixa e espaços, é recusado com 409 e nada é criado (cenário 2), em `apps/api/test/alunos.e2e-spec.ts` (FR-014)
- [ ] T035 [P] [US2] Teste e2e (`lento`): cada professor lista só os próprios alunos (cenário 3), em `apps/api/test/alunos.e2e-spec.ts` (FR-015)
- [ ] T036 [P] [US2] Teste e2e (`lento`): redefinir a senha de aluno próprio gera nova provisória, invalida a anterior e derruba as sessões dele (cenário 4); de aluno de outro professor e de id inexistente dá o mesmo 404 (cenário 5), em `apps/api/test/alunos.e2e-spec.ts` (FR-016)
- [ ] T037 [P] [US2] Teste e2e (`lento`): as três rotas de alunos dão 401 sem token e 403 para aluno logado (cenário 6), em `apps/api/test/alunos.e2e-spec.ts` (FR-012, FR-010)

### Implementação da História 2

- [ ] T038 [US2] Geração da senha provisória e `UsuariosService.criarAluno`, `listarAlunos`, `redefinirSenhaAluno`, com a posse filtrada por `teacher_id` em `apps/api/src/usuarios/`
- [ ] T039 [US2] `AlunosController` com `@Roles('PROFESSOR')`, DTOs e Swagger; regenerar `openapi.json` e os tipos do front (depende de T038)
- [ ] T040 [US2] Front: `apps/web/app/(app)/alunos` com lista, formulário de criação, ação de redefinir e o aviso da provisória mostrada uma vez (FR-020) (depende de T039)
- [ ] T041 [US2] Validação manual da tela de alunos com capturas (390px e 1280px, claro e escuro) (FR-020)

**Checkpoint**: História 2 funcional; gate e e2e verdes.

---

## Fase 5: História de Usuário 3 - O aluno troca a senha provisória (Prioridade: P3)

**Objetivo**: conta com senha provisória só troca a senha; depois da troca, usa o sistema.

**Teste Independente**: entrar com a provisória, ser levado à troca, trocar, chegar à inicial de
aluno; sair e entrar com a nova.

**Arquivos**: `apps/api/src/auth/` (guard, decorator, `trocar-senha`),
`apps/api/test/senha-provisoria.e2e-spec.ts`, `apps/web/app/(auth)/trocar-senha`,
`apps/web/app/(app)/` (redirecionamento e inicial de aluno), `apps/api/openapi.json`,
`apps/web/lib/api/schema.d.ts`.

### Testes para a História 3 ⚠️

- [ ] T042 [P] [US3] Teste de unidade: `SenhaProvisoriaGuard` nega com a claim e libera `@PermiteSenhaProvisoria()`, em `apps/api/src/auth/guards/senha-provisoria.guard.spec.ts` (FR-017)
- [ ] T043 [P] [US3] Teste e2e (`lento`): o login de conta provisória informa que a senha é provisória (cenário 1); com ela, `me`, `refresh`, `logout` e `trocar-senha` respondem e toda outra rota dá 403 (cenário 2); `trocar-senha` sem token dá 401, em `apps/api/test/senha-provisoria.e2e-spec.ts` (FR-017)
- [ ] T044 [P] [US3] Teste e2e (`lento`): a troca com a senha atual certa torna a senha definitiva, derruba as outras sessões, mantém a atual e libera as rotas (cenário 3), em `apps/api/test/senha-provisoria.e2e-spec.ts` (FR-018)
- [ ] T045 [P] [US3] Teste e2e (`lento`): a troca é recusada com senha atual errada, nova curta, nova longa demais e nova igual à atual (cenário 4), em `apps/api/test/senha-provisoria.e2e-spec.ts` (FR-018)

### Implementação da História 3

- [ ] T046 [US3] `@PermiteSenhaProvisoria()` e `SenhaProvisoriaGuard` global, entre o `JwtAuthGuard` e o `RolesGuard`, em `apps/api/src/auth/`
- [ ] T047 [US3] `POST /auth/trocar-senha` em `AuthService` e `AuthController`: confere a atual, aplica a política, revoga as outras famílias e emite sessão nova; regenerar `openapi.json` e os tipos (depende de T046)
- [ ] T048 [US3] Front: `apps/web/app/(auth)/trocar-senha`, redirecionamento obrigatório quando a conta é provisória e a inicial de aluno (FR-020) (depende de T047)
- [ ] T049 [US3] Validação manual: roteiro do teste independente e capturas da troca de senha e da inicial de aluno (FR-020)

**Checkpoint**: História 3 funcional; gate e e2e verdes.

---

## Fase 6: Polimento e Preocupações Transversais

- [ ] T050 Revisar a cobertura de teste contra os FRs da spec e a regra do `workflow.md`: toda rota com 401, 403, dado de outro dono e caminho feliz (SC-003); apagar teste duplicado
- [ ] T051 Checagem de segurança: nenhum log com senha, token ou hash; `.env.example` com todas as variáveis; nenhum dado real em seed, teste ou captura; sem `console.log` de depuração
- [ ] T052 Aplicar "Contratos tocados" em `specs/_sistema/autenticacao.md` (C-01, C-02, C-03)
- [ ] T053 Rodar o roteiro do SC-001 num clone limpo seguindo só o `README.md`
- [ ] T054 Gravar `specs/001-contas-acesso/retro.md` e rodar o gate final e os gates de PR do `workflow.md` (lint, formatação, tipos, unidade, e2e, build)

## Dependências e Ordem de Execução

- Setup → Fundação → História 1 → História 2 → História 3 → Polimento.
- A História 2 depende da 1 (login e guards). A História 3 depende da 2 (é o professor quem
  cria a conta provisória); os e2e da 3 usam as rotas de alunos como "outra rota".
- `apps/api/openapi.json` e `apps/web/lib/api/schema.d.ts` são tocados pelas três histórias:
  sem paralelismo entre histórias.

## Notas

- Histórias 1 e 3 e a migration (T008) são críticas (autenticação, autorização, migration):
  modelo mais capaz.
- Um commit por história, com a prova do gate e do e2e.

## Registro de execução

### Setup, Fundação e História 1 (2026-11-17)

Feitas num commit só: a base não tem como ser provada sem a primeira rota.

- **Feito**: T001 a T031. Unidade: 16 testes; e2e: 27 testes (5 arquivos); gate, build e
  formatação verdes; roteiro manual no navegador (erro de login, entrar, recarregar, sair).
- **Desvios do plano**:
  - Vitest e oxlint na API no lugar de Jest e ESLint (D-15, exceção aprovada pelo dono).
  - Node 24 baixado pelo pnpm para o projeto (`devEngines.runtime`), em vez de instalado na
    máquina; o `corepack` desta máquina não roda o pnpm 12, então o pnpm veio por
    `npm install -g`.
  - O limite de login usa um guard aplicado só na rota de login, não um `ThrottlerGuard`
    global: mesmo efeito, sem tocar as outras rotas.
  - Componentes de interface escritos à mão no padrão shadcn/ui: o `shadcn init` 4.23 não
    reconhece o Tailwind 4 do esqueleto do Next 16.
  - `cacheComponents` e `partialPrefetching` do esqueleto do Next foram desligados: as telas
    dependem de login no navegador e o recurso acusava erro em toda página protegida.
  - TypeScript 6 na API e 5 no front (o que cada esqueleto oficial fixa), não o 7.
- **Honestidade sobre "teste primeiro"**: os testes foram escritos antes do código, mas código e
  testes rodaram juntos pela primeira vez; eu não vi cada teste falhar antes de passar.
- **Capturas**: entrar e inicial conferidas em 390px claro e 1280px escuro. As combinações
  390px escuro e 1280px claro não foram captadas.
- **Pendências**: nenhuma que bloqueie a História 2.
