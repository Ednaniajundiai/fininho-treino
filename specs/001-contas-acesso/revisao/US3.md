APROVADO: 0 bloqueantes

# Revisão: História 3, rodada 1 (001-contas-acesso)

**Escopo**: `git diff 03979cf..dcc9856` (commit `dcc9856`), sem os gerados
(`apps/api/openapi.json`, `apps/web/lib/api/schema.d.ts`), mais `apps/api/src/auth/sessoes.service.ts`
do commit `03979cf` (trava por conta). Revisão feita lendo o código e os testes; a suíte e2e não
rodou porque outra frente usa o banco de teste. Vitest e oxlint na API são exceção aprovada e não
entram como achado. História crítica (autorização).

## Etapa 1: aderência

### Cenários da História 3

| # | Cenário | Teste | Testa o comportamento? |
|---|---|---|---|
| 1 | Aluno com provisória entra e é levado à troca | `apps/api/test/senha-provisoria.e2e-spec.ts:46` (login 200 com `usuario.senhaProvisoria = true`) + roteiro manual T049 | Sim, na parte de regra: a API informa a marca. O redirecionamento é navegação do front (FR-020, `[sem teste]`), validado à mão e registrado no `tasks.md` |
| 2 | Com provisória, tudo que não é trocar, `me`, renovar ou sair dá "sem permissão" | `:52` (`me` 200 com a marca, `refresh` 200, `logout` 204), `:69` (professora com provisória: `GET` e `POST /api/alunos` dão 403 com a mensagem da provisória e nada é criado), `:99` (trocar-senha alcançável com a provisória); unidade em `senha-provisoria.guard.spec.ts:27-39` | Sim. Bom desenho: usar a professora isola o 403 da provisória do 403 do papel |
| 3 | Troca válida: senha definitiva, outras sessões caem, segue logado na inicial | `:99` (200, `senhaProvisoria=false`, token e cookie novos funcionam, nova entra, provisória dá 401, hash argon2id), `:122` (o outro aparelho e o cookie antigo dão 401), `:136` (rotas do papel voltam a 200) | Sim. "Tela inicial de aluno" é FR-020, validada à mão (captura 390px escuro) |
| 4 | Nova curta ou igual à provisória: recusa com o motivo | `:154` (atual errada, < 8, > 128, igual; 400 com o motivo e a provisória continua valendo e continua provisória) | Sim |

### Requisitos

| FR | Teste | Situação |
|---|---|---|
| FR-017 | `senha-provisoria.e2e-spec.ts:52`, `:69`; `senha-provisoria.guard.spec.ts` | Coberto |
| FR-018 | `senha-provisoria.e2e-spec.ts:99`, `:122`, `:136`, `:154` | Coberto (exige a atual, 8 a 128, diferente, definitiva, outras sessões caem) |
| FR-020 | `[sem teste]` | Roteiro manual e capturas registrados no `tasks.md` (História 3) |

### Rota nova `POST /api/auth/trocar-senha`

- Sem token, 401: `senha-provisoria.e2e-spec.ts:94`.
- Caminho feliz: `:99`.
- Papel errado e dado de outro dono não se aplicam, confirmado no código: o controller
  (`auth.controller.ts:128-137`) só passa `usuario.id` do token; o DTO (`trocar-senha.dto.ts`) não
  tem id de conta, e o `ValidationPipe` com `forbidNonWhitelisted` (`app.setup.ts:17-19`) recusa
  campo extra. `AuthService.trocarSenha` (`auth.service.ts:36-56`) age só sobre essa conta.

## Etapa 2: qualidade e segurança

### Pontos conferidos sem achado

- **Ordem dos guards** (`auth.module.ts:23-25`): `APP_GUARD` roda na ordem de registro, e o
  `AuthModule` é o único que registra guard global. JwtAuthGuard preenche `usuario`,
  SenhaProvisoriaGuard barra, RolesGuard confere o papel. Nenhuma rota autenticada escapa: as
  únicas com `@PermiteSenhaProvisoria()` são `me` e `trocar-senha`, e as que passam sem
  `usuario` são as `@Public()` (login, refresh, logout, health), todas permitidas pelo FR-017. Não
  há `@PermiteSenhaProvisoria()` em nível de classe.
- **Claim `mcp` depois da troca**: o token de acesso antigo continua com `mcp=true` até vencer.
  Só restringe mais (403 fora de `me`/`trocar-senha`), e o front troca pelo token novo da
  resposta. Sem risco.
- **Ordem das checagens** em `trocarSenha`: senha atual primeiro, depois política, depois
  igualdade; o argon2 da nova roda fora da transação (a trava não fica presa durante o hash).
  Revogação e `update` na mesma transação, sob a trava da conta.
- **Vazamento**: a resposta usa `paraContaDto` (campos explícitos, sem hash); nenhum `Logger` ou
  `console` no caminho; o DTO só limita tamanho. Atende FR-019.
- **400 em vez de 401** para senha atual errada: correto, evita o ciclo de renovação do cliente
  (`apps/web/lib/api/cliente.ts`).
- **Front**: `(app)/layout.tsx:18-23` e `entrar/page.tsx:17-20` levam à troca quando a marca
  está ligada; `trocar-senha/page.tsx:18-21` manda o anônimo para `/entrar` e a conta definitiva
  para `/`. É só conveniência: a API nega por conta própria (teste `:69`).

### Trava por conta (`sessoes.service.ts`, commit `03979cf`)

- **Fecha a corrida entre renovação, logout e revogação?** Sim. As três tomam
  `pg_advisory_xact_lock(hashtext(userId))` antes de escrever. Em READ COMMITTED cada comando
  depois da trava enxerga o que já foi confirmado, e o `updateMany` condicional de `renovar`
  (`:58-61`, `usedAt null` e `revokedAt null`) reconfere o estado depois da trava, então a leitura
  do token antes dela (`:50`) não abre janela: se a revogação confirmou antes, `count = 0` e dá
  401; se a renovação confirmou antes, o token novo já existe e a revogação o pega.
- **Deadlock?** Não vejo risco: toda transação toma uma trava só (de uma conta) e a toma antes de
  escrever em `refresh_tokens` ou em `users`; não há transação que trave duas contas. Colisão de
  `hashtext` entre contas só serializa, não cria ciclo.
- **O que a trava não cobre**: `abrir` (login e o fim de `trocarSenha`) não toma a trava nem
  reconfere a senha. Ver M1.

### Achados

**BLOQUEANTE**: nenhum.

**MELHORIA**

- **M1** `apps/api/src/auth/auth.service.ts:37-55`: a sessão nova é aberta fora da transação e da
  trava (`:55`), e a senha atual é conferida contra um hash lido antes (`:37-38`). Se o professor
  redefinir a senha do aluno no meio da troca, (a) o `update` do aluno sobrescreve a provisória
  nova do professor, e (b) o token de renovação criado em `:55` nasce depois da revogação do
  professor e sobrevive a ela. Janela curta e de pouco dano (é o próprio dono da conta), mas é a
  mesma corrida que o `03979cf` fechou para a renovação. Sugestão: emitir dentro da transação
  (expor em `SessoesService` um `abrir(usuario, { tx })` que use `emitir(..., tx)`) e fazer o
  `update` condicional ao hash lido (`updateMany where { id, passwordHash: usuario.passwordHash }`;
  `count = 0` vira 409 ou 400 "a senha mudou, entre de novo"). O login tem a mesma janela contra
  redefinição; registrar como risco aceito ou tratar junto.
- **M2** `apps/api/src/auth/auth.controller.ts:114-137`: `trocar-senha` não tem limite de
  tentativas. Quem tiver um token de acesso roubado (até 15 min) pode testar senhas atuais sem
  freio além do custo do argon2. Sugestão: o mesmo `LimiteDeLoginGuard` com `@Throttle` (5/min).
- **M3** claim `mcp` velha depois de redefinição (`jwt-auth.guard.ts:42`): quando o professor
  redefine a senha de um aluno que já tinha senha definitiva, o token de acesso dele segue com
  `mcp=false` por até 15 min e passa pelo `SenhaProvisoriaGuard`, contra a regra do C-02 ("só
  consegue trocar a senha"). É o risco já aceito no `plan.md` ("token de acesso sobrevive à
  redefinição", Riscos), e hoje o aluno não tem rota além de `me`/`trocar-senha`, mas a 002 e a 003
  vão abrir rotas de aluno. Sugestão: deixar explícito no risco do plan que ele inclui escapar da
  trava da provisória, para as próximas features saberem.
- **M4** `apps/api/src/auth/guards/jwt-auth.guard.ts:42`: `mcp` ausente no payload vira `false`
  (falha aberta). Só o servidor assina, então não é explorável hoje; `mustChangePassword:
  payload.mcp !== false` deixa a guarda falhar fechada sem custo.
- **M5** `apps/api/src/auth/decorators.ts:97-100`: o comentário lista só "trocar a senha e
  consultar a própria conta"; vale citar que renovar e sair passam por serem `@Public()`, para
  ninguém marcar `@PermiteSenhaProvisoria()` nelas achando que falta.
- **M6** `specs/_sistema/autenticacao.md` C-02 e C-03: ainda dizem "só consegue trocar a senha" e
  "carrega o id e o papel". A spec já declara as mudanças em "Contratos tocados"; aplicar no
  fechamento da feature.
- **M7** `apps/web/app/(auth)/trocar-senha/page.tsx:80`: a dica diz só "Pelo menos 8 caracteres";
  acrescentar "e no máximo 128" alinha com a regra (a API já devolve o motivo).
- **M8** `sessoes.service.ts:104`: a espera pela trava conta no tempo limite padrão da transação
  interativa do Prisma (5 s); sob disputa, vira 500 em vez de esperar. Volume baixo, sem ação agora;
  anotar se aparecer.
