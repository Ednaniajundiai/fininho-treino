# Stack de Referência: fininho-treino

**Decisão didática (declarada)**: esta stack é a da vaga de Dev Júnior Full Stack da CS Academy,
escolhida de propósito no lugar da stack padrão do dono (Python/FastAPI). O objetivo é aprender
NestJS com prova em repositório. A complexidade que vem disso é aceita, mas cada plan a declara no
veredito de proporção.

## Stack padrão

- **Runtime**: Node.js 24 LTS; TypeScript em modo `strict`.
- **Monorepo**: pnpm workspaces. `apps/api` (backend) e `apps/web` (frontend); pacote
  compartilhado só quando houver código usado pelos dois.
- **Backend**: NestJS; REST documentado com `@nestjs/swagger` (OpenAPI); validação com
  `class-validator` / `class-transformer`.
- **Banco de dados**: PostgreSQL, só ele. ORM Prisma, com migrations versionadas. Não há banco
  NoSQL neste app: o MongoDB do fininho-watch é consumido por HTTP.
- **Autenticação**: JWT de acesso de vida curta + refresh token; senha com argon2; guard global
  de autenticação com `@Public()` para as exceções; `RolesGuard` com `@Roles()`; checagem de
  posse no service. Contrato em `specs/_sistema/autenticacao.md`.
- **Frontend**: React + Next.js (App Router) + Tailwind + shadcn/ui + TanStack Query; tipos do
  cliente gerados do OpenAPI da API. Visual: `~/.claude/DESIGN.base.md` aplicado ao shadcn/ui
  (sem `DESIGN.md` próprio por enquanto).
- **GraphQL**: fora do MVP. Entra só na feature opcional 006 (`@nestjs/graphql`, code-first).
- **Testes**: Jest no backend (unidade + e2e com `supertest` contra Postgres de teste em
  container). Frontend: validação manual (perfil Padrão).
- **Infraestrutura**: Docker (um Dockerfile por app); Docker Compose em desenvolvimento;
  produção na VPS Hostinger via Dokploy (Traefik + Let's Encrypt), Postgres como serviço
  nativo do Dokploy, só na rede interna.
- **CI**: GitHub Actions em toda PR: lint, tipos, suíte completa e build.

Versões exatas: a estável atual de cada pacote, confirmada na documentação no plan da 001.

## Restrições Técnicas

- Segredos só por variável de ambiente, documentados em `.env.example`; nunca no repositório.
- Fuso do domínio: São Paulo (UTC-3), o mesmo do fininho-watch; datas de treino em
  `AAAA-MM-DD` local.
- Sem serviço pago novo (e-mail transacional, fila, cache) sem problema concreto escrito na spec.
- Merge na `main` = deploy em produção depois da feature 005; migration exige backup recente.

## Integrações que não podem quebrar

- **fininho-watch** (só leitura): `GET /v1/resumos/{data}` e `GET /v1/resumos?de=&ate=`, com
  token de leitor Bearer. Contrato consumido em `specs/_sistema/fininho-watch.md`.
