# Board (roteiro)

**Atualizado em**: 2026-11-17, pela PR do roteiro

Estado ao vivo (em spec, em implementação, em PR) vem do git e do status local do supervisor, não
deste arquivo. Limite: uma feature em implementação por vez; specs até duas à frente.

## Features

| Ordem | Feature | Entrega | Depende de | Arquivos | Contratos (`_sistema/`) |
|---|---|---|---|---|---|
| 1 | 001-contas-acesso | Monorepo, Compose de dev e CI de pé; login com papéis professor e aluno; professor cria a conta do aluno; sem auto-cadastro; primeiro professor por comando de CLI | — | `package.json`, `pnpm-workspace.yaml`, `apps/api/src/{auth,usuarios,prisma}`, `apps/api/prisma/`, `apps/web/app/(auth)`, `docker-compose.yml`, `.github/workflows/`, `scripts/` | `autenticacao/C-01`, `C-02`, `C-03` |
| 2 | 002-fichas-treino | Professor monta a ficha (dias A–E, exercícios, séries, faixa de repetições, carga) e atribui ao aluno; aluno vê a ficha dele | 001 | `apps/api/src/fichas`, `apps/web/app/fichas` | `fichas/C-01`, `C-02`, `C-03`; `autenticacao/C-01` |
| 3 | 003-registro-sessao | Aluno registra a sessão feita de um dia da ficha (séries, repetições, carga, observação) e vê o histórico; professor vê as sessões dos alunos dele | 002 | `apps/api/src/sessoes`, `apps/web/app/sessoes` | `sessoes/C-01`, `C-02`; `fichas/C-03`; `autenticacao/C-01` |
| 4 | 004-integracao-fininho-watch | Na conta do dono, a sessão do dia mostra o treino medido pelo relógio (esporte, início, duração); sem integração, aviso e o resto funciona | 003 | `apps/api/src/fininho-watch`, tela da sessão | `fininho-watch/C-01`; `sessoes/C-01` |
| 5 | 005-deploy-vps | App em produção na VPS via Dokploy, com domínio e HTTPS, migrations no deploy, backup do Postgres, contas demo fictícias e carga da ficha real do dono por script local fora do Git | 004 | `apps/*/Dockerfile`, `docker-compose.prod.yml`, `scripts/` | — |
| 6 | 006-graphql-historico (opcional) | Consulta GraphQL de histórico e progressão do aluno (ficha → sessões → séries), ao lado do REST | 005 | `apps/api/src/graphql` | `fichas/C-01`, `sessoes/C-01`; `autenticacao/C-01` |

## Decisões transversais

- Stack da vaga CS Academy como decisão didática declarada → `constitution/stack.md`.
- Papéis professor e aluno, sem admin, sem auto-cadastro; posse checada no servidor →
  `constitution/constitution.md` (princípio I) e `specs/_sistema/autenticacao.md`.
- Repositório público, só dados fictícios → princípio II e `constitution/workflow.md`.
- Produção só com a conta do dono e contas demo; aluno real fora (LGPD) → `workflow.md`.
- Integração com o relógio só na conta do dono, só leitura e opcional → princípio III e
  `specs/_sistema/fininho-watch.md`.
- Só PostgreSQL (Prisma); REST com OpenAPI; GraphQL só na 006; Jest; pnpm workspaces; GitHub
  Actions → `constitution/stack.md`.
- Contratos de ficha, rotação, sessão e progressão dupla → `specs/_sistema/fichas.md` e
  `specs/_sistema/sessoes.md`.
- A ficha A–E do `fininho-health/plan.md` é o conteúdo inicial da conta do dono, sem
  sincronização com o coach; carga na 005, por script local.

## Fora do roteiro (por enquanto)

- Papel admin: sem uso real hoje; entra por emenda se aparecer.
- Convite de aluno por e-mail: exige serviço de e-mail; a conta é criada pelo professor com senha
  provisória (`autenticacao/C-02`).
- Alunos reais e tratamento LGPD de dado de terceiros: feature própria com consentimento.
- Vínculo de relógio por aluno e escrita no fininho-watch.
- Segundo banco (MongoDB) neste app.
- Testes automatizados de tela e E2E de navegador (perfil Padrão).
- Fases de adaptação (ex.: "semanas 1–2 com menos séries"): o professor edita a ficha.
