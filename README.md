# fininho-treino

App de fichas de treino. O professor monta a ficha e a atribui ao aluno; o aluno vê a dele e
registra a sessão feita. Projeto de uso real e de portfólio, com a stack escolhida de propósito
para aprender NestJS (ver `constitution/stack.md`).

Repositório público: **só dados fictícios** em código, testes, exemplos e capturas de tela.

## Stack

- **API** (`apps/api`): NestJS 12, Prisma 7, PostgreSQL 17, OpenAPI (Swagger), Vitest.
- **Web** (`apps/web`): Next.js 16 (App Router), Tailwind 4, TanStack Query, tipos gerados do
  OpenAPI.
- **Monorepo**: pnpm workspaces. **CI**: GitHub Actions.

## Rodar em desenvolvimento

Pré-requisitos: [pnpm](https://pnpm.io) 12 e Docker. O Node 24 é baixado pelo próprio pnpm para
o projeto (`devEngines` no `package.json`); não precisa instalar.

```bash
pnpm install                 # dependências, Node 24 do projeto e cliente Prisma
cp .env.example .env         # depois troque o JWT_ACCESS_SECRET por um valor aleatório
docker compose up -d         # Postgres em 127.0.0.1:5450 (bancos de desenvolvimento e de teste)
pnpm db:migrate              # aplica as migrations
pnpm --filter api build
pnpm --filter api cli criar-professor   # cria a primeira conta (pergunta nome, e-mail e senha)
pnpm dev                     # API em http://127.0.0.1:3001 e web em http://localhost:3000
```

Abra `http://localhost:3000` e entre com a conta criada. A documentação da API fica em
`http://127.0.0.1:3001/api/docs`.

Não há auto-cadastro: o primeiro professor nasce pelo comando acima, e é o professor quem cria
as contas dos alunos. Para trocar a senha de um professor que já existe:
`pnpm --filter api cli criar-professor --redefinir`.

## Comandos

| Comando                                              | O que faz                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Estilo, tipos e formatação                                                             |
| `pnpm test`                                          | Testes de unidade (rápidos, sem banco)                                                 |
| `pnpm --filter api test:e2e`                         | Testes e2e da API contra o banco de teste (precisa do `docker compose up -d`)          |
| `pnpm build`                                         | Build da API e do web                                                                  |
| `pnpm gen:api`                                       | Regenera `apps/api/openapi.json` e os tipos do front; rode depois de mudar rota ou DTO |
| `bash scripts/gate.sh`                               | Gate rápido (lint, tipos, unidade)                                                     |

Os testes e2e apagam e recriam o banco `fininho_treino_test`. Eles nunca usam o banco de
desenvolvimento nem o de produção.

## Como o acesso funciona

- Dois papéis, **professor** e **aluno**. Toda rota da API exige autenticação, salvo login,
  renovação da sessão, logout e verificação de saúde.
- Token de acesso (JWT) de 15 minutos, guardado só na memória do navegador. Token de renovação de
  7 dias em cookie `httpOnly`, `Secure`, `SameSite=Strict`, que gira a cada uso; reuso de um token
  já girado derruba todas as sessões daquele login.
- A autorização (papel e posse do dado) é sempre da API. O front só esconde o que ela já negaria.

Contratos em `specs/_sistema/`, princípios em `constitution/` e o roteiro em `specs/BOARD.md`.
