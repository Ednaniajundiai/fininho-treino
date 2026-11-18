# Análise de consistência: 001-contas-acesso (rodada 2)

**Veredito**: PRONTO PARA IMPLEMENTAR

Rodada 2 · commit analisado `fe2e60a75af1cc2c98e480cddfd366817b2391ba` · 2026-11-17 ·
escopo: o bloqueante da rodada 1 e o diff `fca1a1b..fe2e60a` em `specs/001-contas-acesso`.

Script `rastrear.sh` no novo commit: 20 FRs, 54 tarefas, perfil Padrão, 0 achados objetivos
(proporção: 2,7 tarefas por FR, 14 decisões, veredito ADEQUADO).

## Bloqueante da rodada 1

1. **Contradição spec × plan: logout público** — **RESOLVIDO** (opção a).
   - `spec.md` FR-010 agora inclui "sair" nas exceções e diz que sair "vale pela credencial de
     renovação do aparelho, mesmo com o acesso de 15 minutos já vencido"; o cenário 9 da
     História 1 repete a lista com "sair".
   - O delta de `autenticacao/C-01` em "Contratos tocados" registra que sair entra nas exceções
     públicas; a T052 aplica o delta.
   - Bate com o `plan.md` ("Rotas da API": `POST /auth/logout | pública (vale o cookie)`; o
     `Path=/api/auth` do cookie cobre o logout).
   - T019 passa a provar o comportamento: logout só com o cookie, sem token de acesso, e cita
     FR-010.

## Diff desde a rodada 1

Nenhuma contradição nova. As mudanças em `plan.md` e `tasks.md` atendem melhorias da rodada 1:

- Melhoria 1 (401 de `trocar-senha`): atendida em T043.
- Melhoria 2 (`CHECK` da migration): atendida em T010 (`migration.e2e-spec.ts`).
- Melhoria 3 (FR-019, argon2id): atendida em T016.
- Melhoria 4 (T017 instável): atendida; a conta entra a partir de outra origem.
- Melhoria 5 (claim de senha provisória): atendida no delta de `autenticacao/C-03`.
- Melhoria 7 (número de decisões): atendida em "Sinais" ("7 (mais 7 secundárias)").

## Melhorias que seguem abertas (sem nova rodada)

1. **[DECISÃO SEM DONO] HS256 e `trust proxy`** (melhoria 6 da rodada 1): sem mudança. Baratas
   de reverter.
2. **[DESVIO TRANSITÓRIO] Node 22.14 local** (melhoria 8 da rodada 1): sem mudança; decidir antes
   da T001.
3. **[A VERIFICAR] Logout sem cookie** (novo em T019): a tarefa diz que "sem cookie responde
   sem erro e sem efeito", mas o `plan.md` ("Rotas da API") não descreve esse caso. Não
   contradiz spec nem plan; vale anotar a resposta esperada (por exemplo, 204) na linha da rota.

---

# Análise de consistência: 001-contas-acesso (rodada 1)

**Veredito**: BLOQUEADO — 1 bloqueante

Rodada 1 · commit analisado `fca1a1b174e5aca70b07b3c939979862add191c8` · 2026-11-17

Script `rastrear.sh`: 20 FRs, 54 tarefas, perfil Padrão, 0 achados objetivos (nenhum FR sem
tarefa ou sem teste, nenhum ID duplicado, nenhuma dependência inválida, nenhuma clarificação
aberta, nenhuma decisão sem "Decidida por").

## Bloqueantes

1. **Contradição spec × plan: logout público** (Fase 3).
   - `plan.md`, tabela "Rotas da API": `POST /auth/logout | pública (vale o cookie)`.
   - `spec.md` FR-010: "Toda operação DEVE exigir usuário autenticado, exceto entrar, renovar a
     sessão e a verificação de saúde"; o cenário 9 da História 1 repete a mesma lista. O contrato
     `autenticacao/C-01` lista as mesmas três exceções, e o delta de C-01 em "Contratos tocados"
     não diz que o logout entra nelas (só o delta de C-03 diz que o cookie vale para o logout).
   - Nenhuma tarefa prova o comportamento escolhido: T019 testa a revogação, T020 e T037 testam
     401 só em `me` e `/alunos`.
   - **Correção sugerida** (recomendada a opção a): (a) incluir "sair" nas exceções do FR-010 e
     do cenário 9 e escrever no delta de `autenticacao/C-01` que o logout é público e vale pelo
     cookie, porque precisa funcionar com o token de acesso vencido e só revoga o token
     apresentado. Depois, acrescentar em T019 o caso "logout sem token de acesso, só com o
     cookie, revoga a sessão". (b) Ou, mantendo a spec, mudar o plan para logout autenticado
     (`JwtAuthGuard` + cookie) e testar o 401 em T019.

## Melhorias

1. **[TESTE INCOMPLETO] 401 de `POST /auth/trocar-senha`** (1.3, DoD do `workflow.md`, SC-003):
   T043 a T045 cobrem o comportamento com conta provisória, mas nenhuma tarefa cita o caso "sem
   token" nessa rota. A T050 deve pegar isso, mas é melhor citar o caso em T043.
2. **[TESTE INCOMPLETO] O `CHECK` de aluno/professor da migration (D-01) não tem teste**
   (1.3): o cabeçalho do `tasks.md` promete "caso extra … migration", mas T010 só aplica a
   migration. Sugestão: um e2e que tenta gravar um ALUNO sem `teacher_id` (e um PROFESSOR com
   `teacher_id`) direto pelo Prisma e espera erro.
3. **[TESTE INCOMPLETO] FR-019, "guardada só de forma irreversível"**: T016 e T033 provam que a
   senha não aparece na resposta, mas nenhuma tarefa confere que `password_hash` é argon2id e não
   a senha. Basta uma asserção em T015 ou T016.
4. **[A VERIFICAR] T017, "a conta continua entrando depois"**: com uma janela de 1 minuto, o
   teste precisa esperar 60 s, controlar o relógio ou trocar de origem. Vale definir isso na
   tarefa para o e2e não ficar lento nem instável.
5. **[CONTRATO] Claim `mcp` no JWT** (`plan.md`, "Sessão"; D-08): `autenticacao/C-03` diz que o
   token "carrega o id do usuário e o papel". Acrescentar a marca de senha provisória é uma
   extensão compatível, mas não está no delta de C-03 em "Contratos tocados". Incluir no delta
   para que a T052 aplique.
6. **[DECISÃO SEM DONO] HS256 e `trust proxy`**: o algoritmo do JWT (`plan.md`, "Sessão") e o
   `trust proxy` para o salto do Next ("Riscos", T009) são escolhas técnicas fora da tabela e da
   lista de herdadas. As duas são baratas de reverter.
7. **[PROPORÇÃO] Número de decisões inconsistente**: "Sinais" diz "decisões de entrevista 7
   versus FRs 20", mas a tabela tem 14 (D-01 a D-14). O veredito ADEQUADO continua de pé
   (14 < 20, 2,7 tarefas por FR); só falta corrigir o número.
8. **[DESVIO TRANSITÓRIO] Node 22.14 local** (D-07; `stack.md` exige Node 24 LTS): o produto
   mira o 24 (`.nvmrc`, CI), e o 22.14 na máquina é provisório e está declarado em D-07 e em
   Riscos. Não é desvio do produto, mas, se o Prisma 7.10.1 recusar o 22.14 (T001), a
   implementação local para. Vale decidir antes de começar: instalar o Node 24.

## Limitações da análise

- O script rodou sem erro; a Fase 1 mecânica não foi refeita à mão.
- `governance.md` não foi lido (fora do escopo desta skill).
- Dispensas de teste (FR-001, FR-002 e FR-020) conferidas: configuração de ambiente, CI e tela.
  São legítimas no perfil Padrão e estão marcadas na spec.
- Tarefas sem FR nem história (T001 a T005, T007 a T010 e T050 a T054): todas rastreiam a
  decisões do plan (D-01, D-06, D-07, D-12 a D-14, "Base do repositório") ou aos gates do
  `workflow.md`. Nenhuma é órfã.
- O Dockerfile adiado (D-09) bate com o `specs/BOARD.md`, que põe `apps/*/Dockerfile` na
  005. Não é desvio.
- `scripts/gate.sh` existe e roda lint, typecheck e unidade, como o plan supõe.
- Decisões "recomendação aceita" e "secundária (não vetada)" foram tratadas como válidas: o dono
  delegou a entrevista, e isso está registrado na spec e no plan.
