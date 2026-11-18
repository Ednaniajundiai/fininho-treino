APROVADO: 0 bloqueantes

# Revisão: História 2, rodada 1 (001-contas-acesso)

**Escopo**: `git diff cf19307..91934e8` (commit `91934e8`), sem os gerados
(`apps/api/openapi.json`, `apps/web/lib/api/schema.d.ts`). Revisão feita lendo o código e os
testes pelo commit. A suíte e2e não rodou porque outra frente usa o banco de teste; arquivos não
commitados do worktree (História 3) ficaram fora. Vitest e oxlint na API são exceção aprovada e
não entram como achado.

## Etapa 1: aderência

### Cenários da História 2

Testes em `apps/api/test/alunos.e2e-spec.ts` (linhas no commit `91934e8`).

| # | Cenário | Teste | Testa o comportamento? |
|---|---|---|---|
| 1 | Professor cria aluno: conta vinculada a ele, provisória aparece uma vez | `:39` (201, `aluno` exato, `teacherId` = professora, hash argon2id, provisória fora da linha do banco), `:60` (o aluno entra com ela), `:69` (a listagem não a traz; chaves exatas) | Sim |
| 2 | E-mail já usado (outra caixa): "e-mail já cadastrado", nada criado | `:81` (caixa e espaços, de outro professor; e-mail de professor; 409 com a mensagem; só 1 aluno) | Sim. Concorrência não testada, mas garantida pelo índice único (ver Etapa 2) |
| 3 | Dois professores: cada um vê só os dele | `:100` (listas exatas dos dois lados), `:112` (vazia) | Sim |
| 4 | Redefinir: nova provisória uma vez, antiga deixa de valer, sessões caem | `:120` (nova diferente, antiga 401, nova 200, refresh da sessão aberta 401), `:143` (volta a exigir troca) | Sim |
| 5 | Aluno de outro professor: "não encontrado", igual a inexistente | `:155` (dois 404 com corpos iguais; a senha da Bia continua valendo), `:169` (id de professor dá 404) | Sim |
| 6 | Aluno logado: criar, listar e redefinir dão "sem permissão" | `:186` (três 403, mensagem conferida na criação, nada criado) | Sim. O aluno do teste tem senha definitiva, então o 403 vem do papel e não do FR-017 |

### Requisitos

| FR | Teste | Situação |
|---|---|---|
| FR-012 | `alunos.e2e-spec.ts:39`, `:186`, `:180` | Coberto |
| FR-013 | `senha-provisoria.spec.ts` (política, não repete, alfabeto), `alunos.e2e-spec.ts:39,69,120` | Coberto |
| FR-014 | `alunos.e2e-spec.ts:81` | Coberto |
| FR-015 | `alunos.e2e-spec.ts:100,112` | Coberto |
| FR-016 | `alunos.e2e-spec.ts:120,143,155,169` | Coberto |
| FR-019 | `alunos.e2e-spec.ts:39` (hash argon2id, provisória fora do banco), `:69` (listagem sem hash nem provisória) | Coberto. Log: o diff não registra nada; não há log de corpo nem de requisição (conferido) |
| FR-020 | `[sem teste]` | Fora da exigência. Capturas incompletas (M5) |

### Autorização das rotas novas (regra do `workflow.md`)

| Rota | 401 | 403 | Outro dono | Feliz |
|---|---|---|---|---|
| `POST /api/alunos` | `:180` | `:186` | Sem parâmetro de dono: o vínculo vem do token (`:54`). Tentativa de injetar o dono no corpo não testada (M1) | `:39` |
| `GET /api/alunos` | `:180` | `:186` | `:100` | `:100` |
| `POST /api/alunos/:id/redefinir-senha` | `:180` | `:186` | `:155`, `:169` | `:120` |

### Testes fracos

Nenhum passaria com a função vazia. `:75` (`not.toHaveProperty('senhaProvisoriaValor')`) é
inócuo sozinho, mas a asserção de chaves exatas logo abaixo cobre. "200 senhas diferentes"
(`senha-provisoria.spec.ts:9`) não prova aleatoriedade, só pega um gerador constante; a
aleatoriedade se garante pelo código (Etapa 2), não por teste, o que está certo.

## Etapa 2: qualidade e segurança

### Bloqueantes

Nenhum.

### Melhorias

- **M1** `alunos.e2e-spec.ts` (rota `POST /api/alunos`): falta o teste que tenta criar aluno
  para outro professor, com `teacherId`/`professorId` no corpo, e espera 400 sem criar nada. Hoje
  o `ValidationPipe` com `forbidNonWhitelisted` (`app.setup.ts:17`) já recusa, e o service usa
  só o id do token. Um teste de 4 linhas fecha a prova do princípio I para essa rota, como pede o
  `workflow.md`.
- **M2** `apps/web/app/(app)/alunos/page.tsx:38-41`, `:52-55`, `:89`: o comentário da `:20` diz
  que a provisória fica só no estado da tela, mas ela também fica em `criar.data` e
  `redefinir.data`, no `MutationCache` do `QueryClient` criado em `components/providers.tsx`
  (raiz do app). Depois de "Já anotei", e ainda 5 min depois de sair da tela (gcTime padrão),
  ela continua em memória. Não há persistência (sem `localStorage`, `sessionStorage`, persister
  nem devtools), então o risco é baixo. Correção: chamar `criar.reset()` e `redefinir.reset()`
  no "Já anotei" (e no `onSuccess`, depois de copiar para o estado), ou passar `gcTime: 0` nas
  duas mutações.
- **M3** `page.tsx:154-157`: "Redefinir senha" age com um clique, sem confirmação. Um clique
  errado invalida a senha que o aluno usa e derruba as sessões dele. Pedir confirmação ("Gerar
  nova senha para Ari? A atual deixa de valer.").
- **M4** `alunos.e2e-spec.ts:39`: a resposta da criação confere `aluno` com `toEqual`, mas não
  as chaves do corpo inteiro. Afirmar `Object.keys(resposta.body)` igual a
  `['aluno', 'senhaProvisoria']` (e o mesmo em `:120`) fecha FR-019 contra um campo a mais no
  topo (por exemplo, o `usuario` inteiro com hash).
- **M5** FR-020 / T041 (`tasks.md`): o registro diz capturas em 390px escuro e 1280px claro;
  faltam 390px claro e 1280px escuro, e a redefinição na tela não foi exercitada à mão. T041 está
  marcada `[x]` com a validação incompleta. Fechar antes da PR, junto com o M10 da História 1.
- **M6** `usuarios.service.ts:131-135`: a redefinição revoga as sessões do aluno numa transação,
  mas uma renovação dele em curso no mesmo instante pode gravar um token que a revogação não
  enxerga (mesmo risco residual do M11 da História 1, rodada 2). A correção da M11 (travar a
  família ou a conta) resolve as duas.
- **M7** `usuarios.service.ts:132`: o `update` depois da checagem de posse filtra só por `id`.
  Está correto hoje (o `teacher_id` do aluno não muda), mas
  `updateMany({ where: { id, teacherId } })` dentro da transação deixa a posse no próprio
  comando que altera, sem depender dessa premissa. Opcional.

### Conferido sem achado

- **Posse** (`usuarios.service.ts`): `listarAlunos` (`:115`) filtra por `teacherId`;
  `redefinirSenhaAluno` (`:123`) passa por `alunoDoProfessor` (`:144`), que busca por
  `id` **e** `teacherId` e lança o mesmo `NotFoundException('Aluno não encontrado.')` para
  inexistente, aluno de outro professor e id de professor; `criarAluno` (`:89`) usa o
  `professorId` do token. `@Roles('PROFESSOR')` na classe do controller cobre as três rotas.
  `ParseUUIDPipe` dá 400 antes da consulta, sem revelar nada.
- **Senha provisória** (`senha-provisoria.ts`): `crypto.randomInt`, que usa amostragem por
  rejeição, então não há viés de módulo; alfabeto de 31 símbolos (23 letras sem i, l, o, mais
  2 a 9), 12 sorteios, cerca de 59 bits. Suficiente para senha de uso único que o aluno troca no
  primeiro acesso e que tem o login limitado a 5 tentativas por minuto. Cumpre a política
  (8 a 128) sempre, pois o tamanho é fixo.
- **Vazamento**: a provisória só aparece em `AlunoComSenhaProvisoriaDto`, na criação e na
  redefinição; `paraContaDto` não leva hash; o hash é calculado antes da transação e nunca sai
  do service; nenhum log no diff. O `ConflictException` não ecoa o e-mail.
- **Unicidade do e-mail sob concorrência**: não há checagem prévia (sem janela entre ler e
  gravar); quem garante é o `@unique` de `email` (`schema.prisma:24`), e o `P2002` vira 409
  (`usuarios.service.ts:108`). Duas criações simultâneas com o mesmo e-mail dão uma 201 e uma
  409. O e-mail chega normalizado pelo `CriarAlunoDto` (borda), então caixa e espaços não
  escapam do índice. O único índice único de `users` além da PK é o `email`, logo mapear
  qualquer `P2002` para "e-mail já cadastrado" é correto.
- **Contrato** `autenticacao/C-01` e `C-02` (com as modificações de "Contratos tocados"):
  provisória gerada pelo sistema e mostrada uma vez; o professor redefine; redefinir derruba as
  sessões (`revogarDoUsuario` na mesma transação do novo hash) e volta `mustChangePassword` a
  `true`; 404 igual para outro dono e inexistente; o front não decide autorização (o card de
  alunos na inicial é só navegação).
- **Front**: a provisória não vai para `localStorage`, URL nem query cache (`['alunos']` traz só
  `ContaDto`); campos com `autoComplete="off"`; aviso de "mostrada uma vez". O `POST` com corpo
  passa a sobreviver ao 401 graças à cópia em `cliente.ts` (M2 da História 1).
- **Comando de professor** (M3 da História 1): `criarProfessor` valida nome e e-mail antes de
  tudo, com teste em `cli.e2e-spec.ts:47`. O comando sempre pergunta o nome, inclusive com
  `--redefinir`, então a validação nova não quebra a redefinição.
- **Princípios**: validação na borda (DTO com `Transform` + `class-validator`), regra de geração
  isolada em função pura testada por unidade, unicidade garantida pela estrutura (índice) e não
  por convenção. O registro diz que os e2e foram vistos falhando antes do código.
