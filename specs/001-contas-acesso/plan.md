# Implementation Plan: Contas e acesso

**Branch**: `001-contas-acesso` | **Data**: 2026-11-17 | **Spec**: `specs/001-contas-acesso/spec.md` | **Status**: Aprovado em 2026-11-17

## Resumo

Cria o monorepo (`apps/api` em NestJS + Prisma, `apps/web` em Next.js), o Compose de
desenvolvimento e a CI, e entrega o acesso: comando de CLI que cria o professor, login com JWT de
15 min e token de renovação opaco de 7 dias que gira a cada uso, guards globais (autenticação,
senha provisória, papel), criação e listagem de alunos pelo professor com posse checada no
service, e troca obrigatória da senha provisória. O front fala com a API pela mesma origem
(`/api` repassado pelo Next) e usa tipos gerados do OpenAPI.

## Decisões técnicas

O dono delegou a entrevista ("siga com o que for ideal"): nenhuma linha abaixo é escolha direta
dele; todas ficam abertas a veto na aprovação.

| ID | Decisão | Opções consideradas | Escolhida | Decidida por | FRs | Custo de reverter |
|---|---|---|---|---|---|---|
| D-01 | Modelo de contas | A. uma tabela `users` com `role` e `teacher_id`; B. tabelas separadas de professor e aluno | A, com `CHECK` no banco: aluno tem professor, professor não tem | recomendação aceita | FR-003, FR-012, FR-014, FR-015 | alto |
| D-02 | Como o front fala com a API | A. mesma origem, Next repassa `/api/*` ao Nest (rewrites); B. origens separadas com CORS | A | recomendação aceita | FR-007, FR-010 | médio |
| D-03 | Guard de autenticação | A. `@nestjs/jwt` com guard próprio (capítulo oficial); B. Passport (`passport-jwt`) | A | recomendação aceita | FR-010 | baixo |
| D-04 | Token de renovação | A. valor aleatório opaco (32 bytes), hash SHA-256 e família no banco; B. JWT de renovação | A | recomendação aceita | FR-007, FR-008, FR-009 | médio |
| D-05 | Cliente tipado do front | A. `openapi-typescript` + `openapi-fetch`; B. `orval` | A | recomendação aceita | FR-020 | baixo |
| D-06 | Banco dos testes e2e | A. Postgres do Compose com banco de teste separado, service container na CI; B. Testcontainers | A | recomendação aceita | SC-003 | baixo |
| D-07 | Node e pnpm locais | A. Node 24 na máquina e pnpm via `corepack`; B. Node 22 local, 24 só na CI | A: `.nvmrc` 24, `packageManager` fixado; enquanto o dono não instalar o Node 24, o trabalho local roda no 22.14 e a CI é a prova no 24 | recomendação aceita | FR-001, FR-002 | baixo |
| D-08 | Estado "senha provisória" nas rotas | A. claim no JWT + guard global com `@PermiteSenhaProvisoria()`; B. consulta ao banco a cada requisição | A: a troca de senha emite sessão nova, então a claim nunca fica velha para quem trocou | secundária (não vetada) | FR-017 | baixo |
| D-09 | Compose de desenvolvimento | A. só o Postgres no Compose, apps com `pnpm dev` no host; B. apps também em container | A: Dockerfile dos apps é da 005 | secundária (não vetada) | FR-001 | baixo |
| D-10 | Comando de CLI | A. script que sobe o contexto do Nest (`createApplicationContext`) e chama o service; B. `nest-commander` | A | secundária (não vetada) | FR-003, FR-004 | baixo |
| D-11 | Limite de tentativas | A. `@nestjs/throttler` em memória, só no login; B. contador no banco | A | secundária (não vetada) | FR-006 | baixo |
| D-12 | Ids | A. UUID gerado pelo banco; B. autoincremento | A: id não revela contagem nem ordem | secundária (não vetada) | — | alto |
| D-13 | Nomes no banco e na API | tabelas e colunas em inglês (`users`, `refresh_tokens`, `teacher_id`, `must_change_password`); valores de domínio e rotas em português (`PROFESSOR`, `ALUNO`, `/alunos`, `/auth/trocar-senha`) | como descrito | secundária (não vetada) | — | médio |
| D-14 | Deriva do contrato OpenAPI | a CI regenera `openapi.json` e os tipos do front e falha se houver diferença | como descrito | secundária (não vetada) | FR-002 | baixo |

**Herdado da constituição (não entrevistado)**: NestJS, Prisma, PostgreSQL, Swagger,
`class-validator`, argon2, guard global com `@Public()`, `@Roles()`, posse no service, Next.js +
Tailwind + shadcn/ui + TanStack Query, Jest + supertest, pnpm workspaces, Docker Compose, GitHub
Actions (`constitution/stack.md`); JWT de 15 min e renovação de 7 dias em cookie
(`specs/_sistema/autenticacao.md`); ESLint + Prettier e os gates (`constitution/workflow.md`).

## Proporção

**Classificação**: porte uso próprio e portfólio · dano de errar dinheiro/dados (dado pessoal e
de saúde) · vida útil anos · volume baixo · objetivo aprender (NestJS, decisão didática
declarada em `stack.md`)

**Degrau adotado**: 5 por natureza (o repositório não tem código: a feature cria os dois apps e a
infraestrutura de desenvolvimento). Dentro disso, cada escolha é a mais baixa que resolve:
biblioteca oficial em vez de Passport, Compose em vez de Testcontainers, script em vez de
biblioteca de CLI, limite em memória em vez de Redis, nenhum pacote compartilhado.

**Sinais**: tarefas por FR 2,7 (alerta acima de 3) · decisões de entrevista 7
versus FRs 20 · serviço ou dependência nova sim (tudo é novo; nenhum serviço pago nem
infraestrutura além do Postgres) · interface com uma só implementação não · configuração sem
segundo uso não

**Veredito**: ADEQUADO — a complexidade vem da stack didática (monorepo com dois apps, rotação de
token com detecção de reuso), já declarada na constituição e exigida pelo contrato `C-03`. Nada
foi acrescentado além do que a spec e os contratos pedem.

## Contexto Técnico

**Linguagem/Versão**: herdado de `constitution/stack.md` (Node.js 24 LTS, TypeScript `strict`).

**Dependências Principais** (estável atual no npm em 2026-11-17; a versão exata fica no lockfile):
NestJS 12 (`@nestjs/core` 12.5, `@nestjs/jwt` 12.0, `@nestjs/swagger` 12.1, `@nestjs/config`
12.1, `@nestjs/throttler` 6.8), Prisma 7.10 (`prisma` e `@prisma/client` na mesma versão),
`argon2` 0.45, `class-validator` 0.15, `class-transformer` 0.5, `cookie-parser` 1.4, Next.js
16.4, React 19.3, Tailwind 4.3, TanStack Query 5, `openapi-typescript` 7.13, `openapi-fetch`
0.17. Jest, ts-jest, supertest, ESLint, Prettier, shadcn e pnpm: última estável, conferida na
instalação.

**Atenção ao Prisma**: a tag `latest` do pacote `prisma` aponta hoje para `8.0.0-rc.34` (release
candidate), enquanto `@prisma/client` estável é 7.10.1. Os dois ficam fixados em **7.10.1**; não
instalar por `latest`.

**Armazenamento**: PostgreSQL (herdado). Duas tabelas:

```text
users
  id uuid pk · name · email (único, gravado em minúsculas e sem espaços nas pontas)
  password_hash (argon2id) · role (PROFESSOR | ALUNO) · must_change_password bool
  teacher_id uuid null fk users(id) · created_at · updated_at
  CHECK: (role = 'ALUNO') = (teacher_id IS NOT NULL)     -- escrito à mão na migration

refresh_tokens
  id uuid pk · user_id fk users(id) on delete cascade · family_id uuid
  token_hash (único, SHA-256 do valor) · expires_at · used_at null · revoked_at null · created_at
  índices: user_id, family_id
```

**Testes**: Jest. Unidade (gate rápido, sem banco): normalização de e-mail, política de senha,
geração de senha provisória, decisão da rotação (válido, vencido, reuso), guards. E2E
(`*.e2e-spec.ts`, `test:e2e`, Postgres de teste): toda rota com sem token (401), papel errado
(403), dado de outro dono (404) e caminho feliz; rotação e reuso de ponta a ponta; migration
aplicada do zero no `globalSetup`; CLI chamando o mesmo service. Banco `fininho_treino_test`,
tabelas truncadas entre arquivos. Telas: validação manual com captura (390px e 1280px, claro e
escuro).

**Plataforma-Alvo**: desenvolvimento local (Windows, Postgres em container); CI no GitHub
Actions (Ubuntu, Node 24, Postgres como service container). Produção é a 005.

**Metas de Performance**: sem meta explícita. Gate rápido abaixo de 2 min.

**Restrições**: segredos só por variável de ambiente, documentados em `.env.example`
(`DATABASE_URL`, `JWT_ACCESS_SECRET`, `API_INTERNAL_URL`, portas); log sem senha, token ou hash.

## Desenho

### Rotas da API (prefixo `/api`)

| Rota | Acesso | Senha provisória | O que faz |
|---|---|---|---|
| `GET /health` | pública | — | verificação de saúde |
| `POST /auth/login` | pública, 5/min por origem | — | devolve token de acesso e a conta; grava o cookie de renovação |
| `POST /auth/refresh` | pública (vale o cookie) | permitida | gira o token de renovação e devolve novo token de acesso |
| `POST /auth/logout` | pública (vale o cookie) | permitida | revoga o token de renovação do aparelho e limpa o cookie |
| `GET /auth/me` | autenticado | permitida | a própria conta |
| `POST /auth/trocar-senha` | autenticado | permitida | troca a senha, revoga as outras famílias e emite sessão nova |
| `POST /alunos` | `PROFESSOR` | negada | cria o aluno; devolve a provisória uma vez |
| `GET /alunos` | `PROFESSOR` | negada | lista os alunos do professor logado |
| `POST /alunos/:id/redefinir-senha` | `PROFESSOR` | negada | nova provisória; revoga as sessões do aluno; 404 se não for dele |

### Guards globais, nesta ordem

1. `ThrottlerGuard`: só age onde há `@Throttle` (login).
2. `JwtAuthGuard`: 401 sem token válido, salvo `@Public()`. Põe `{ id, role, mustChangePassword }`
   na requisição.
3. `SenhaProvisoriaGuard`: 403 se a claim `mustChangePassword` é verdadeira, salvo
   `@PermiteSenhaProvisoria()`.
4. `RolesGuard`: 403 se a rota tem `@Roles()` e o papel não bate.

A posse fica no service: toda consulta de aluno filtra por `teacher_id = usuário logado`; não
achou, 404.

### Sessão

- Token de acesso: JWT HS256, 15 min, claims `sub`, `role`, `mcp` (senha provisória).
- Token de renovação: 32 bytes aleatórios em base64url; no banco só o SHA-256 (o valor tem
  entropia alta, argon2 aqui não acrescenta). Cookie `httpOnly`, `Secure`, `SameSite=Strict`,
  `Path=/api/auth`, 7 dias. O `Path` cobre renovação e logout (o contrato dizia "restrito à rota
  de renovação"; o logout também precisa ler o cookie para revogá-lo).
- Rotação atômica: `UPDATE ... SET used_at = now() WHERE token_hash = ? AND used_at IS NULL AND
  revoked_at IS NULL AND expires_at > now()`. Uma linha alterada: emite o próximo token na mesma
  família. Nenhuma: se o token existe e já foi usado, revoga a família inteira; em todo caso, 401.
- Login com e-mail inexistente faz uma verificação argon2 contra um hash fixo, para o tempo de
  resposta não revelar se o e-mail existe.
- Trocar ou redefinir a senha revoga os tokens de renovação da conta. Um token de acesso já
  emitido ainda vale até vencer (no máximo 15 min): risco aceito, ver Riscos.

### Front

- `next.config` repassa `/api/:path*` para `API_INTERNAL_URL`.
- Token de acesso só em memória (contexto React). Ao carregar a página, o front chama
  `/api/auth/refresh`; se falhar, vai para `/entrar`. Uma renovação por vez por aba
  (single-flight), repetindo a requisição que recebeu 401.
- Rotas: `(auth)/entrar`, `(auth)/trocar-senha`, `(app)/` (inicial por papel), `(app)/alunos`.
  O front só esconde o que a API já nega.
- Visual: `~/.claude/DESIGN.base.md` aplicado aos tokens do shadcn/ui.

### CLI

`pnpm --filter api cli criar-professor`: pede nome, e-mail e senha (sem eco); com
`--redefinir`, troca a senha de um professor existente e revoga as sessões dele. Recusa e-mail de
aluno. Usa o mesmo `UsuariosService` da API.

### Base do repositório

- Raiz: `package.json` (scripts `dev`, `lint`, `typecheck`, `test`, `build`, `format`),
  `pnpm-workspace.yaml`, `.nvmrc`, `.env.example`, ESLint e Prettier compartilhados.
- `docker-compose.yml`: Postgres com volume, porta local e um script de inicialização que cria
  o banco de teste.
- `.github/workflows/ci.yml`: instala, gera o cliente Prisma, lint, formatação, tipos, testes de
  unidade, e2e com Postgres, build, e a checagem de deriva do OpenAPI (D-14).
- README: os comandos do SC-001, do clone ao primeiro login.

## Checagem de Constituição

- **I. Posse no servidor**: respeita. Guards globais negam por padrão; a posse do aluno é
  filtrada no service por `teacher_id`; todo e2e de rota cobre 401, 403 e 404 de outro dono.
- **II. Nenhum dado real**: respeita. Seed, testes e capturas usam contas fictícias
  (`*@exemplo.test`); a conta do dono nasce pelo CLI, fora do Git.
- **III. fininho-watch**: não se aplica nesta feature.
- **IV. Nest idiomático**: respeita. Módulos `prisma`, `auth`, `usuarios`, `health`; DTOs com
  `class-validator` e `ValidationPipe` global (`whitelist`); regra em service; `@Public()`,
  `@Roles()` e `@PermiteSenhaProvisoria()` como decorators.
- **V. Contrato da API é a fonte**: respeita. Swagger em `/api/docs`; `openapi.json` gerado por
  script; tipos do front gerados dele; a CI barra deriva.

Sem violações.

## Estrutura do Projeto

### Documentação (desta feature)

```text
specs/001-contas-acesso/
├── spec.md
├── plan.md
├── tasks.md
├── ANALISE_CONSISTENCIA.md
└── revisao/USn.md
```

### Código-Fonte (raiz do repositório)

```text
package.json · pnpm-workspace.yaml · .nvmrc · .env.example · docker-compose.yml
.github/workflows/ci.yml
scripts/gate.sh (existente) · scripts/postgres-init.sql
apps/api/
├── prisma/schema.prisma · prisma/migrations/
├── src/main.ts · app.module.ts · openapi.ts
├── src/prisma/            # PrismaModule, PrismaService
├── src/health/            # GET /health
├── src/auth/              # controller, service, tokens, guards, decorators, DTOs
├── src/usuarios/          # UsuariosService (contas), AlunosController, senha, DTOs
├── src/cli/criar-professor.ts
└── test/                  # *.e2e-spec.ts, setup do banco de teste
apps/web/
├── app/(auth)/entrar · app/(auth)/trocar-senha
├── app/(app)/page.tsx · app/(app)/alunos
├── components/ui/         # shadcn
└── lib/api/               # schema gerado, cliente, sessão em memória
```

**Decisão de Estrutura**: dois apps e nenhum pacote compartilhado (o `stack.md` só o admite
quando houver código usado pelos dois; os tipos chegam ao front pelo OpenAPI).

**Histórias → arquivos**:

- **H1** (P1): toda a base da raiz, `docker-compose.yml`, CI, `apps/api` (prisma, health, auth,
  `UsuariosService.criarProfessor/redefinirSenhaProfessor`, CLI), `apps/web` (esqueleto,
  `entrar`, inicial de professor, cliente e sessão).
- **H2** (P2): `usuarios` (criar, listar, redefinir senha de aluno, geração da provisória),
  `apps/web/app/(app)/alunos`.
- **H3** (P3): `SenhaProvisoriaGuard`, `POST /auth/trocar-senha`, `app/(auth)/trocar-senha`,
  redirecionamento no front, inicial de aluno.

## Riscos

- **Token de acesso sobrevive à redefinição de senha** por até 15 min. Aceito: a alternativa
  (consultar o banco a cada requisição) anula o ganho do JWT; o prazo curto é a mitigação.
- **Duas abas renovando ao mesmo tempo** podem disparar a detecção de reuso e derrubar a sessão.
  Aceito neste ciclo (um usuário, poucas abas); se incomodar, entra uma janela de tolerância.
- **Limite de login por origem atrás de proxy**: a API vê o IP do Next (e do Traefik na 005).
  `trust proxy` configurado para o salto do Next; revisar na 005.
- **Cookie `Secure` em `http://localhost`**: Chrome e Firefox aceitam; Safari não. Validação
  manual em Chrome.
- **Prisma 7 e NestJS 12** são mais novos que boa parte dos tutoriais: conferir a documentação
  oficial na instalação (configuração do Prisma, adaptador do driver) em vez de assumir.
- **Node 22.14 na máquina do dono**: até ele instalar o 24, a prova no Node 24 é a CI. O
  `prisma` mais novo declara `engines` `^22.18.0 || ^24.11.0`: se o 7.10.1 também recusar o
  22.14, a implementação local espera o Node 24 (ou um 22 mais novo).
- **Ferramentas de teste em versões desalinhadas**: Jest 30.5, `ts-jest` 29.4 e TypeScript 7.0
  são as estáveis de hoje. Conferir a compatibilidade na instalação; se o `ts-jest` não aceitar
  o Jest 30 ou o TypeScript 7, usar o transformador que a documentação do Nest 12 indicar.
- **Migration**: primeira do projeto, sem dado a preservar. Desfazer = apagar o banco de
  desenvolvimento; não há produção antes da 005.

## Rastreamento de Complexidade

Sem violações a justificar.
