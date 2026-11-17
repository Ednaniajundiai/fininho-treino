# Implementation Plan: Fichas de treino

**Branch**: `002-fichas-treino` | **Data**: 2026-11-17 | **Spec**: `specs/002-fichas-treino/spec.md` | **Status**: Aprovado em 2026-11-17

## Resumo

Adiciona o módulo `fichas` à API (NestJS + Prisma) e as telas do professor e do aluno. O professor
mantém um catálogo de exercícios e monta fichas por aluno (dias em rotação, itens de força e de
cardio); salvar a ficha é uma gravação única que substitui dias e itens numa transação. O banco
garante uma ficha ativa por aluno. O aluno lê a própria ficha ativa. Posse checada no service
(`autenticacao/C-01`), como na 001.

**Dependência**: o plan usa os nomes do plan da 001 (`users`, `teacher_id`, `JwtAuthGuard`,
`RolesGuard`, `@Roles()`, `PrismaService`). A 001 ainda está em implementação: conferir contra o
código dela quando entrar na `main`, antes de implementar.

## Decisões técnicas

O dono respondeu "ok" ao bloco de recomendações: todas as linhas abaixo são `recomendação aceita`
ou `secundária (não vetada)`; nenhuma é escolha direta dele e todas ficam abertas a veto na
aprovação.

| ID | Decisão | Opções consideradas | Escolhida | Decidida por | FRs | Custo de reverter |
|---|---|---|---|---|---|---|
| Q-1 | Ficha arquivada | A. só leitura, sem reativar; B. editável/reativável | A | recomendação aceita | FR-014 | baixo |
| Q-2 | Teto de dias e itens | A. sem teto; B. 10 dias e 30 itens por dia | B | recomendação aceita | FR-003, FR-004 | baixo |
| D-01 | Modelo de dados | A. `exercises`, `plans`, `plan_days`, `plan_items` (item único com `type` e `CHECK`); B. tabelas por tipo de item; C. JSONB | A | recomendação aceita | FR-003 a FR-006, FR-011, FR-012 | médio |
| D-02 | Gravação da ficha | A. `PUT /fichas/:id` substitui dias e itens numa transação; B. rotas granulares | A | recomendação aceita | FR-003 a FR-005, FR-009 | baixo |
| D-03 | Uma ficha ativa por aluno | A. índice único parcial no banco + ativação em transação; B. só no service | A | recomendação aceita | FR-006 | baixo |
| D-04 | Exercício desativado | `active` booleano; nunca apaga | como descrito | secundária (não vetada) | FR-011 | baixo |
| D-05 | Rótulo dos dias | o servidor deriva A, B, C… da ordem; o cliente não envia | como descrito | secundária (não vetada) | FR-003, FR-012 | baixo |
| D-06 | Duplicar | `POST /fichas/:id/duplicar` com `alunoId` de destino, no servidor | como descrito | secundária (não vetada) | FR-010 | baixo |
| D-07 | Rotas | professor: `/exercicios`, `/alunos/:alunoId/fichas`, `/fichas/:id`; aluno: `GET /minha-ficha` | como descrito | secundária (não vetada) | FR-007, FR-008 | médio |
| D-08 | Editor no front | `react-hook-form` com `useFieldArray` (padrão do shadcn Form) | como descrito | secundária (não vetada) | FR-013 | baixo |
| D-09 | Testes | regras puras em função testada sem banco; e2e para posse, ativação e `CHECK`s | como descrito | secundária (não vetada) | todos | baixo |
| D-10 | Seed de desenvolvimento | exercícios genéricos fictícios por script de seed | como descrito | secundária (não vetada) | — | baixo |

**Herdado**: NestJS, Prisma, PostgreSQL, Swagger, `class-validator` (`constitution/stack.md`);
ids UUID e nomes em inglês nas tabelas e em português nas rotas (001, D-12 e D-13); guards globais,
`@Roles()` e posse no service (`autenticacao/C-01`, princípios I e IV); Vitest e oxlint na API
(exceção da 001, d551983); Next.js, shadcn/ui, TanStack Query e tipos gerados do OpenAPI
(princípio V); fuso de São Paulo.

## Proporção

**Classificação**: porte uso próprio e portfólio · dano de errar dados (dado de treino) · vida útil
anos · volume baixo · objetivo aprender (NestJS)

**Degrau adotado**: 3 — código simples em módulos novos sobre a base da 001. Sem nova
infraestrutura, serviço ou dependência além de `react-hook-form`/`zod` do padrão do shadcn.

**Sinais**: tarefas por FR a medir no tasks (alerta acima de 3) · decisões de entrevista 5 versus FRs
14 · serviço ou dependência nova não (só `react-hook-form`) · interface com uma só implementação
não · configuração sem segundo uso não

**Veredito**: ENXUTO — CRUD sobre a base existente, sem sinais de alerta.

## Contexto Técnico

**Linguagem/Versão**: herdado de `constitution/stack.md` (Node.js 24, TypeScript `strict`).

**Dependências Principais**: herdado; adiciona `react-hook-form` e `zod` no web (versão estável
atual conferida na instalação).

**Armazenamento**: PostgreSQL. Quatro tabelas (nomes provisórios; ajustar à 001):

```text
exercises   id uuid pk · teacher_id fk users(id) · name · default_unit (REPS | SECONDS)
            · active bool default true · created_at
            único (teacher_id, lower(name))                      -- índice escrito à mão
plans       id uuid pk · student_id fk users(id) · teacher_id fk users(id) · name
            · status (ACTIVE | ARCHIVED) · created_at · updated_at
            único parcial (student_id) WHERE status = 'ACTIVE'   -- D-03, escrito à mão
plan_days   id uuid pk · plan_id fk on delete cascade · position int · title
            único (plan_id, position)
plan_items  id uuid pk · day_id fk on delete cascade · position int · type (STRENGTH | CARDIO)
            · notes null
            · exercise_id null fk · sets null · range_min null · range_max null · unit null
            · cardio_mode null (TREADMILL | BIKE | STAIRS | FREE) · minutes_min null · minutes_max null
            único (day_id, position)
            CHECK STRENGTH: exercise_id, sets>=1, range_min<=range_max, unit presentes; campos de cardio nulos
            CHECK CARDIO:   cardio_mode, minutes_min<=minutes_max presentes; campos de força nulos
```

O rótulo do dia (A, B, C…) não é coluna: deriva de `position` (D-05).

**Testes**: Vitest (exceção da 001). Unidade, sem banco: validação da ficha (faixa mínima ≤ máxima,
ao menos um dia e um item, tetos, derivação do rótulo). E2E (`*.e2e-spec.ts`): por rota 401, 403,
404 de outro dono e caminho feliz; ativação arquivando a anterior; duas ativações simultâneas
deixam uma só ativa (índice parcial); `CHECK`s por tipo; migration do zero. Telas: validação manual
com captura (390px e 1280px, claro e escuro).

**Plataforma-Alvo**: herdado (dev local com Postgres em container; CI no GitHub Actions).

**Metas de Performance**: sem meta explícita.

**Restrições**: log sem dado de treino em texto; só dados fictícios no seed e nos testes.

## Desenho

### Rotas da API (prefixo `/api`)

| Rota | Papel | O que faz |
|---|---|---|
| `GET /exercicios` · `POST /exercicios` | `PROFESSOR` | lista (com desativados, marcados) e cria no catálogo dele; 409 em nome duplicado |
| `PATCH /exercicios/:id` | `PROFESSOR` | renomeia, muda a unidade padrão ou desativa/reativa; 404 se não for dele |
| `GET /alunos/:alunoId/fichas` | `PROFESSOR` | fichas do aluno (ativa e arquivadas); 404 se o aluno não for dele |
| `POST /alunos/:alunoId/fichas` | `PROFESSOR` | cria ficha (dias e itens) como rascunho ou já ativa |
| `GET /fichas/:id` | `PROFESSOR` | ficha completa; 404 se não for dele |
| `PUT /fichas/:id` | `PROFESSOR` | substitui dias e itens numa transação; só ficha ativa ou rascunho |
| `POST /fichas/:id/ativar` | `PROFESSOR` | arquiva a ativa do aluno e ativa esta, na mesma transação |
| `POST /fichas/:id/arquivar` | `PROFESSOR` | arquiva |
| `POST /fichas/:id/duplicar` | `PROFESSOR` | cria ficha nova a partir desta, para o `alunoId` informado (dele) |
| `GET /minha-ficha` | `ALUNO` | a ficha ativa do aluno logado, ou vazio |

Todas com `@Roles()` e posse por `teacher_id` no service; dado de outro dono responde 404. Item de
força só aceita exercício **ativo** e do catálogo do próprio professor.

**Rascunho**: a ficha nasce como `DRAFT` ou já `ACTIVE`; o `status` tem os valores `DRAFT`,
`ACTIVE` e `ARCHIVED` (o contrato só define ativa e arquivada; `DRAFT` nunca é visto pelo aluno nem
pela 003). Ficha arquivada é só leitura (FR-014): `PUT`, `ativar` e `arquivar` respondem 409.

### Front

- `app/fichas`: lista de alunos → fichas do aluno → editor (professor); catálogo em `app/exercicios`.
- `app/minha-ficha` (aluno): dias e itens como prescritos, aviso se não há ficha.
- Editor: `react-hook-form` com `useFieldArray` (dias e itens), salva com um `PUT`; o front só
  esconde o que a API negaria e valida igual ao servidor para dar feedback rápido, sem substituí-lo.
- Tipos do cliente gerados do OpenAPI; visual do `DESIGN.base.md` aplicado ao shadcn/ui.

## Checagem de Constituição

- **I. Posse no servidor**: respeita. Toda rota filtra por `teacher_id` no service; aluno só vê a
  ficha ativa dele; e2e de 401, 403 e 404 por rota.
- **II. Nenhum dado real**: respeita. Seed e testes com exercícios e contas fictícias.
- **III. fininho-watch**: não se aplica.
- **IV. Nest idiomático**: respeita. Módulos `fichas` e `exercicios`, DTOs validados, regra em
  service, `@Roles()`.
- **V. Contrato da API é a fonte**: respeita. Swagger, tipos gerados no front.

Sem violações; a exceção da 001 (Vitest e oxlint) é herdada.

## Estrutura do Projeto

### Documentação (desta feature)

```text
specs/002-fichas-treino/
├── spec.md
├── plan.md
├── tasks.md
└── ANALISE_CONSISTENCIA.md
```

### Código-Fonte

```text
apps/api/
├── prisma/schema.prisma · prisma/migrations/        # 4 tabelas, índices e CHECKs à mão
├── src/exercicios/   # controller, service, DTOs
├── src/fichas/       # controller, service, validação pura, DTOs, duplicação
├── prisma/seed.ts   # exercícios fictícios (dev)
└── test/             # e2e de exercicios e fichas
apps/web/
├── app/exercicios · app/fichas · app/minha-ficha
├── components/ficha/  # editor com useFieldArray
└── lib/api/           # tipos regenerados
```

**Decisão de Estrutura**: dois módulos Nest (`exercicios` e `fichas`), um por domínio (princípio
IV); sem pacote compartilhado.

**Histórias → arquivos**:

- **H1** (P1): migration, `exercicios`, `fichas` (criar, validar, ativar), editor e catálogo no web.
- **H2** (P2): `GET /minha-ficha`, `app/minha-ficha`.
- **H3** (P3): `PUT`, arquivar, duplicar, desativação de exercício, telas de edição e troca.

## Riscos

- **Nomes da 001**: o plan usa os da 001 ainda sem código; conferir antes de implementar.
- **`PUT` troca ids de dia e item**: seguro porque a 003 guarda cópia da prescrição na sessão e
  não aponta para itens. Se a 003 passar a referenciar item, revisar D-02.
- **`DRAFT`**: estado extra além do contrato; contido na API (aluno e 003 só veem `ACTIVE`).
  Confirmar na aprovação ou remover e criar já ativa.
- **Migration**: segunda do projeto, sem dado a preservar antes da 005.

## Rastreamento de Complexidade

Sem violações.
