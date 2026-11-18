APROVADO: 0 bloqueantes

# Rodada 2 (2026-11-18)

**Escopo**: a correção `cf19307` (`git show cf19307`): `apps/api/src/auth/sessoes.service.ts`,
`apps/api/test/auth-sessao.e2e-spec.ts` e `apps/web/lib/api/cliente.ts`. Revisão feita lendo o
código e os testes, sem rodar a suíte e2e (o banco de teste está em uso por outra frente). Pela
regra das duas rodadas, esta confere só os bloqueantes da rodada 1 e o que o diff introduziu.

## B1: corrida na rotação do token. **Resolvido**

`sessoes.service.ts:47-73`: leitura, marca de uso, revogação por reuso e emissão do token novo
rodam numa só `$transaction` interativa (READ COMMITTED, o padrão). Conferido nos dois
entrelaçamentos do mesmo token T1:

- B lê T1 antes de A confirmar: o `UPDATE ... WHERE used_at IS NULL` de B espera o bloqueio de
  linha de A, reavalia depois do commit, recebe `count = 0` e vira REUSO. O `UPDATE` da
  revogação é um comando novo, com foto tirada depois do commit de A, e por isso enxerga e
  revoga o T2.
- B lê T1 depois de A confirmar: `decidirRotacao` já dá REUSO e a revogação também vê o T2.

A revogação é confirmada junto com a transação: o `UnauthorizedException` é lançado fora dela
(`:71`), então o 401 não desfaz a revogação. `abrir`, `encerrar` e `emitir` passaram a receber o
cliente explicitamente, sem mudança de comportamento. Teste novo:
`auth-sessao.e2e-spec.ts:115` (duas renovações em `Promise.all`; no máximo uma 200, o cookie
emitido não renova, nenhum token vivo no banco).

## B2: prazos do FR-007 sem teste. **Resolvido**

`auth-sessao.e2e-spec.ts:90`: decodifica o JWT e afirma `exp - iat === 900` no login e na
renovação; afirma o `expiresAt` do token mais novo a 7 dias (tolerância de 1 min) no login e,
depois de envelhecer o token atual para 1 min, de novo 7 dias após a renovação. Um código que
copiasse o prazo antigo (janela fixa) ou emitisse JWT sem `exp` falharia. Cenário 6 e FR-007
passam a ter cobertura completa.

## M1 e M2 da rodada 1 (`apps/web/lib/api/cliente.ts`). **Resolvidas**

A repetição só pula `login`, `refresh` e `logout` (`:46`), então `/api/auth/me` e a futura troca
de senha renovam depois de 401. A cópia é feita com `request.clone()` no `onRequest` (`:53`),
com o corpo intacto, e removida no `onResponse` e no `onError` (o `openapi-fetch@0.17.0` fixado
fornece `id` e `onError`). A repetição usa o `fetch` global, que não passa pelo middleware: não
há laço, e o cabeçalho `X-Repetida` deixou de ser necessário. A validação manual de um POST com
corpo depois de o acesso vencer continua recomendada.

## Bloqueantes

Nenhum.

## Melhorias novas

- **M11** `sessoes.service.ts:63` e `:101-106` (risco residual da mesma família do B1, não
  introduzido pelo diff): a transação resolve o mesmo token apresentado duas vezes, mas não o
  caso em que um token **antigo** (já girado) chega enquanto outra requisição gira o token
  **atual** da mesma família. Em READ COMMITTED, o `UPDATE` da revogação não enxerga a linha T3
  que a outra transação ainda não confirmou (só reavalia linhas que já existiam na foto), e o T3
  sobrevive. É justamente o caso do roubo (ladrão gira o atual, vítima reapresenta o antigo), mas
  a janela é a duração da transação, de milissegundos. O mesmo vale para `encerrar` (logout) e
  `revogarDoUsuario` (redefinição de senha) concorrentes com uma renovação da mesma conta.
  *Correção sugerida*: logo depois do `findUnique`, travar a família inteira com
  `SELECT id FROM refresh_tokens WHERE family_id = $1 FOR UPDATE` (ou
  `pg_advisory_xact_lock(hashtext(family_id))`), o que serializa as rotações da família; ou
  rodar a transação em `Serializable` com nova tentativa. Decisão do dono: corrigir agora ou
  registrar nos Riscos do plan.
- **M12** `auth-sessao.e2e-spec.ts:115`: o teste de corrida não discrimina (o próprio commit
  registra que ele passou no código antigo em três execuções). Não é teste enfraquecido, e a
  garantia está na estrutura (transação), como pedem os princípios. Vale registrar isso no
  comentário do teste, para ninguém tomá-lo como prova da correção.
- **M13** Registro: o commit `cf19307` cita "44 testes e2e passando", o mesmo total do commit da
  História 2. O número de `cf19307` provavelmente inclui o `alunos.e2e-spec.ts`, que estava no
  worktree sem rastreamento. Sem efeito no código; só a prova do commit fica imprecisa.

As melhorias M3 a M10 da rodada 1 seguem como estavam, salvo M3 (validação no comando) e M9
(texto da inicial por papel), tratadas no commit da História 2 (`91934e8`).

---

# Rodada 1

REPROVADO: 2 bloqueantes

# Revisão: História 1, com Setup e Fundação (001-contas-acesso)

**Escopo**: `git diff d551983..3e29c78` (commit `3e29c78`), sem os gerados (`pnpm-lock.yaml`,
`apps/api/openapi.json`, `apps/web/lib/api/schema.d.ts`). Revisão feita lendo o código e os
testes. A suíte e2e não rodou porque outra frente usa o banco de teste. Vitest e oxlint na API
são exceção aprovada (D-15) e não entram como achado.

Ficaram fora da revisão, por não fazerem parte do commit: `apps/api/src/usuarios/senha-provisoria.spec.ts`
e `apps/api/test/alunos.e2e-spec.ts`, que estão no worktree sem rastreamento (são da História 2,
em andamento).

## Etapa 1: aderência

### Cenários da História 1

| # | Cenário | Teste | Testa o comportamento? |
|---|---|---|---|
| 1 | Comando cria professor com senha definitiva | `test/cli.e2e-spec.ts:20` ("cria a conta de professor…"), `:29` (mais de um) | Sim, pelo `UsuariosService.criarProfessor`, que é a regra. O `src/cli/main.ts` (flags, confirmação da senha, leitura) não tem teste: ver M3 |
| 2 | Comando de novo com `--redefinir`: senha nova, sessões caem | `cli.e2e-spec.ts:47` (sem confirmação recusa), `:56` (com confirmação: senha antiga 401, nova 200, refresh antigo 401) | Sim |
| 3 | Login correto: entra e vê a inicial de professor | `test/auth-login.e2e-spec.ts:19` | API sim. A tela é FR-020, validação manual |
| 4 | Mesma mensagem para e-mail inexistente e senha errada | `auth-login.e2e-spec.ts:38` (corpos iguais e a mensagem exata) | Sim. A equalização de tempo não tem teste (M5) |
| 5 | Na 6ª tentativa em 1 min: "muitas tentativas", sem bloquear a conta | `auth-login.e2e-spec.ts:64` (5×401, 6ª 429 com a mensagem, outra origem 200) | Sim |
| 6 | Depois de 15 min, renova sem senha, por até 7 dias desde a última renovação | `test/auth-sessao.e2e-spec.ts:59` (gira o token), `:90` (vencido dá 401), `:38` (cookie com `Max-Age=604800`) | **Em parte.** Nenhum teste fixa os 15 min do token de acesso nem o prazo de 7 dias gravado no servidor a cada renovação: **B2** |
| 7 | Sair: a sessão do aparelho deixa de valer | `auth-sessao.e2e-spec.ts:104` (só o cookie, sem token de acesso; o outro aparelho segue), `:117` (sem cookie: 204 sem efeito) | API sim. A volta para a tela de entrar é manual |
| 8 | Reuso de credencial já usada derruba a família | `auth-sessao.e2e-spec.ts:74` (reuso 401, token mais novo da família 401, outra família 200); `src/auth/tokens.spec.ts:27` (REUSO tem precedência) | Sim no caso sequencial. No caso concorrente a regra falha: **B1** |
| 9 | Sem sessão, toda operação fora das públicas dá "não autenticado" | `src/auth/guards/jwt-auth.guard.spec.ts` (6 casos), `test/auth-me.e2e-spec.ts:18,24,30` | Sim. `/auth/me` é a única rota protegida da história, e o e2e prova que o guard é global |

### Requisitos

| FR | Teste | Situação |
|---|---|---|
| FR-003 | `cli.e2e-spec.ts:20,29,40` | Coberto (via service) |
| FR-004 | `cli.e2e-spec.ts:47,56,77` | Coberto |
| FR-005 | `auth-login.e2e-spec.ts:19,38` | Coberto |
| FR-006 | `auth-login.e2e-spec.ts:64` | Coberto |
| FR-007 | `auth-sessao.e2e-spec.ts:38,49,59,90,99`, `tokens.spec.ts` | **Incompleto**: 15 min do acesso e os 7 dias no servidor sem teste (B2) |
| FR-008 | `auth-sessao.e2e-spec.ts:74`, `tokens.spec.ts:27` | Coberto no caso sequencial; o caso concorrente falha (B1) |
| FR-009 | `auth-sessao.e2e-spec.ts:104,117` | Coberto |
| FR-010 | `jwt-auth.guard.spec.ts`, `auth-me.e2e-spec.ts:18-35`, `auth-sessao.e2e-spec.ts:104` (logout sem acesso) | Coberto |
| FR-011 | `auth-me.e2e-spec.ts:37` (`toEqual` exato, sem campo a mais) | Coberto |
| FR-014 | `src/usuarios/email.spec.ts`, `auth-login.e2e-spec.ts:33`, `cli.e2e-spec.ts:21` | Coberto na aplicação; o banco não garante (M4) |
| FR-019 | `auth-login.e2e-spec.ts:51` (argon2id, nada de senha ou hash no corpo), `auth-sessao.e2e-spec.ts:49` (só o hash do token no banco) | Coberto. Log: não há log de requisição nem de corpo no código (conferido) |
| FR-001, FR-002, FR-020 | `[sem teste]` | Fora da exigência. Em FR-020 as capturas estão incompletas (M10) |

### Testes fracos

Nenhum dos testes passaria com a função vazia. O teste "libera @Public()" sozinho passaria com um
guard que libera tudo, mas os 4 testes de negação no mesmo arquivo cobrem esse caso.
`tokens.spec.ts:39` (`hash not.toContain(valor)`) é fraco isolado, e as asserções vizinhas
compensam. Não há teste de arquivo de configuração. A sobreposição entre `auth-login:33` e
`cli:21` (e-mail com caixa) é pequena e aceitável.

## Etapa 2: qualidade e segurança

### Bloqueantes

**B1: corrida na rotação permite que um token sobreviva à revogação da família**
(`apps/api/src/auth/sessoes.service.ts:49-63` e `:99-108`)

O `updateMany(... usedAt: null ...)` que marca o uso e o `create` do token novo (em `emitir`)
rodam em comandos separados, sem transação. Sequência com o mesmo token T1 apresentado duas vezes
ao mesmo tempo (vítima e atacante, ou duas chamadas do atacante):

1. A requisição A marca T1 como usado (`count = 1`).
2. A requisição B recebe `count = 0`, trata como REUSO e roda `revogarFamilia`. O T2 de A ainda
   não existe, então não é revogado.
3. A cria T2 com `revokedAt = null`. A família foi "revogada", mas T2 continua renovando.

FR-008 e o contrato C-03 dizem que o reuso derruba a família inteira. Aqui isso depende da ordem
em que as requisições chegam. O T023 pedia "rotação atômica".

*Correção*: rodar a marcação de uso e a emissão do token novo numa só `prisma.$transaction`
(interativa). No PostgreSQL, o `UPDATE` concorrente espera o commit de A, reavalia o `WHERE`,
recebe `count = 0` e só então revoga a família, já enxergando o T2 commitado. Teste: um e2e com
`Promise.all` de duas renovações do mesmo cookie, que afirma que, depois delas, nenhum cookie
devolvido renova (401). Efeito colateral esperado e já aceito no plan (Riscos, "duas abas"):
duas renovações simultâneas passam a derrubar a sessão sempre, de forma determinística.

**B2: FR-007 e o cenário 6 sem teste para os prazos** (`apps/api/test/auth-sessao.e2e-spec.ts`)

Nenhum teste fixa a duração de 15 minutos do token de acesso (`ACESSO_TTL_SEGUNDOS`,
`sessoes.module.ts:18`). O teste de token vencido (`jwt-auth.guard.spec.ts:45`) só prova que o
guard recusa um `exp` no passado. O prazo de 7 dias que vale de verdade é o `expiresAt` gravado
em `sessoes.service.ts:106`, e ele não é conferido: só o `Max-Age` do cookie é. O código poderia
emitir acesso de 1 ano, ou renovação sem prazo no banco, e a suíte continuaria verde.

*Correção*: no e2e de login ou de renovação, decodificar o `accessToken` e afirmar
`exp - iat === 900`. Afirmar também que o `expiresAt` do token gravado no login fica cerca de
7 dias à frente e que, após uma renovação, o token novo ganha um prazo de 7 dias contado dali
(a janela desliza, como pede o cenário 6).

### Melhorias

- **M1** `apps/web/lib/api/cliente.ts:52`: o retry depois de 401 pula todo `/api/auth/`, o que
  inclui `/api/auth/me` (protegida) e o futuro `/api/auth/trocar-senha` (História 3). Depois de
  15 min, essas chamadas recebem 401 sem renovar. Excluir só `login`, `refresh` e `logout`.
- **M2** `apps/web/lib/api/cliente.ts:58`: `new Request(request, …)` sobre uma requisição cujo
  corpo já foi consumido pelo `fetch` provavelmente lança `TypeError` em POST com corpo. Vai
  aparecer no `POST /alunos` da História 2 quando o acesso vencer. Guardar um `request.clone()`
  no `onRequest` e repetir a partir dele. Confirmar com um teste manual.
- **M3** Borda do comando administrativo: `usuarios.service.ts:33-43` e `cli/main.ts:83-84` não
  validam o formato do e-mail nem o nome vazio. Um professor com e-mail inválido é criado e nunca
  consegue entrar, porque o `LoginDto` recusa o e-mail. Validar na entrada do CLI ou no service.
  O próprio `main.ts` (flags, `--redefinir`, senhas que não conferem) não tem teste, mas o caminho
  sem TTY (leitura por pipe) já existe: um smoke test com `spawn` e stdin custa pouco.
- **M4** `prisma/migrations/.../migration.sql:34`: a unicidade sem diferença de caixa (FR-014)
  depende só de toda escrita passar por `normalizarEmail`. Um
  `CHECK (email = lower(btrim(email)))` protege as escritas futuras (alunos, seeds) no próprio
  banco.
- **M5** `auth.service.ts:12-25`: a equalização de tempo está correta (os dois casos fazem a mesma
  verificação argon2, com os mesmos parâmetros), mas não tem teste. Um teste de unidade que
  confirme que `senhaConfere` roda também para e-mail inexistente basta. Não vale medir tempo.
- **M6** Pendências para a 005, já parcialmente nos Riscos do plan: `trust proxy 'loopback'`
  (`app.setup.ts:13`) e `listen('127.0.0.1')` (`main.ts:15`) não servem para containers
  separados (todos cairiam no mesmo balde de 5 logins/min); o Swagger em `/api/docs` fica público
  e o rewrite do Next o expõe; `validarEnv` aceita o valor de exemplo do `JWT_ACCESS_SECRET`.
  O `getTracker` padrão do throttler usa `req.ip`, o endereço mais à direita que não é confiável,
  e por isso não aceita um `X-Forwarded-For` forjado pelo cliente. Isso está correto.
- **M7** `refresh_tokens` não tem limpeza de linhas vencidas ou revogadas. Sem urgência no volume
  atual.
- **M8** `.github/workflows/ci.yml:42-46`: as actions estão fixadas por tag (`@v4`), não por SHA.
  O resto está bom: `permissions: contents: read`, só valores fictícios de CI, e os passos de
  formatação, lint, tipos, unidade, e2e, deriva do OpenAPI e build.
- **M9** `apps/web/app/(app)/page.tsx:15`: o texto "Você entrou como professor" é fixo. Na
  História 1 só existe professor; a História 3 precisa trocá-lo pela inicial de cada papel.
- **M10** FR-020 / T031: faltam as capturas de 390px escuro e de 1280px claro (registradas no
  `tasks.md`). A regra global exige as quatro combinações antes de dar a tela por pronta. Fechar
  antes da PR.

### Conferido sem achado

- **Cookie** (`auth/cookie.ts`): `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth` e 7
  dias, com teste. O cookie é limpo quando a renovação falha e no logout, com as mesmas opções.
  O `Path` mais largo que "só a renovação" está registrado no plan e no contrato modificado.
- **Guard global e `@Public()`**: `JwtAuthGuard` e `RolesGuard` estão em `APP_GUARD`, nesta
  ordem. Só `login`, `refresh`, `logout` e `health` são públicas. O JWT está fixado em HS256 na
  assinatura e na verificação, e a mensagem 401 não diz se o token é inválido ou vencido.
- **Detecção de reuso** (`tokens.ts:37-42`): função pura, REUSO tem precedência sobre vencido e
  revogado, e um token revogado sem uso (logout, redefinição) dá INVALIDO sem efeito colateral.
- **Migration**: `CHECK (("role" = 'ALUNO') = ("teacher_id" IS NOT NULL))` está correto (`role`
  é `NOT NULL`) e tem teste dos dois lados e do caso válido. Que o `teacher_id` aponte para um
  PROFESSOR fica para o service da História 2.
- **Redefinição pelo CLI**: revoga as sessões e grava o hash na mesma transação; o hash é
  calculado antes dela.
- **Vazamento**: `ContaDto` não tem senha nem hash; o token de renovação vai só para o cookie,
  nunca para o corpo; o banco guarda só o SHA-256 dele; não há log de corpo, e o CLI imprime só
  a mensagem do erro. O e2e recusa um banco cujo nome não termine em `_test`.
- **Front**: o token de acesso fica só em memória (variável de módulo, sem `localStorage`); a
  renovação é single-flight por aba e absorve o efeito duplo do StrictMode; não há CORS, e a
  API e o front estão na mesma origem pelo rewrite.
- **Segredos e dados reais**: só `*@exemplo.test` no diff; `.env` está no `.gitignore`; o
  `.env.example` e a CI têm só valores fictícios.
- **Princípios**: as regras puras (`decidirRotacao`, `motivoSenhaInvalida`, `normalizarEmail`)
  não dependem de banco nem de relógio; o e-mail é normalizado no `LoginDto` (borda);
  `whitelist` com `forbidNonWhitelisted`. O registro de execução diz que os testes não foram
  vistos falhando antes de passar. Isso fica anotado, sem virar achado.
