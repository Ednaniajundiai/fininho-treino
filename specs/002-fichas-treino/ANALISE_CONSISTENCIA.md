# Análise de consistência: 002-fichas-treino (rodada 1 de 2)

**Veredito**: BLOQUEADO — 1 bloqueante, já corrigido no `tasks.md` (mudança mecânica, ainda não commitada). Sem bloqueante pendente; a rodada 2 só confere esse item depois do commit.

**Rodada 1** · commit analisado: `46042ca2943ee456dcc8e20064773eded26958b7` (o `tasks.md` ainda não estava commitado) · constituição: `constitution/` (perfil Padrão).

## Bloqueantes

1. **[Contradição entre tarefas, Fase 3] T028 (US2) exigia 403 em `PUT /fichas/:id`, rota que só nasce em T041 (US3).** O gate da história 2 (T033) não passaria, pois T029 "faz T026-T028 passarem". **Corrigido** em `tasks.md`: `PUT` saiu de T028; o 403 do `PUT` já está em T034. FR-007 continua coberto.

## Melhorias

1. **[CONTRATO DIVERGENTE, leve] `DRAFT`.** O plan (linhas 119-121) acrescenta o status `DRAFT`, mas a spec diz que `fichas/C-01` está "sem mudança de formato" e o contrato só tem `ativa | arquivada`. Aprovado pelo dono e contido na API; mas T050 deve registrar `DRAFT` em `fichas/C-01` (ou a spec, em emenda, dizer que o formato muda).
2. **Nota obsoleta de `DRAFT`.** `tasks.md` (Notas) e `plan.md` (Riscos) ainda dizem "confirmar ou remover"; o dono já aprovou. Remover a pendência.
3. **Status da cópia em `duplicar` (D-06, T043, T039) não definido.** Se a cópia nascer `ACTIVE` para um aluno que já tem ficha ativa, arquiva a existente sem aviso. Definir (sugestão: nasce `DRAFT`) e testar em T039.
4. **[DESVIO NÃO REGISTRADO, leve] Vitest/oxlint.** `constitution/stack.md` e `workflow.md` falam em Jest; a exceção (commit `d551983`) existe só na branch `001-contas-acesso`, fora desta branch. O plan a cita como herdada (a constituição pede registro no plan), mas a spec diz "sem exceções". T001 deve conferir que a exceção chegou à `main` e que `stack.md`/`workflow.md` batem (inclusive o "marcador `lento` (Jest)").
5. **[VEREDITO QUESTIONÁVEL]** ENXUTO com 55 tarefas para 14 FRs (média 3,9, acima do alerta de 3 por FR, que o plan mandou medir no tasks). Boa parte é e2e de 401/403/404 exigido pelo workflow; considerar ADEQUADO.
6. **Cenário H2.3 da spec ("não encontrado") x plan.** O aluno não tem rota por id; em `GET /fichas/:id` recebe 403 (papel). O 404 só vale para `/minha-ficha` nunca expor ficha alheia. Esclarecer o cenário na spec (reporte; não alterado).
7. **Dependência fora do plan.** T002 inclui o resolver do shadcn Form (`@hookform/resolvers`); o plan só cita `react-hook-form` e `zod`.
8. **T012 (US1) pede exercício inativo**, mas `PATCH /exercicios/:id` só entra em T044 (US3). Dizer em T012 que o inativo é criado direto no banco pela fixture.

## Verificações feitas (limpas)

- `rastrear.sh` travou (timeout de 60 s, após as seções FR_SEM_TAREFA, FR_SEM_TESTE, IDS_DUPLICADOS e DEPENDENCIA_INVALIDA, todas vazias). O restante foi feito à mão.
- Todo FR tem tarefa e teste: FR-001 T009 · 002 T010 · 003 T008/T011 · 004 T006/T011/T012 · 005 T007/T012/T035 · 006 T014 · 007 T009/T011/T013/T028 · 008 T026/T027 · 009 T034 · 010 T037/T039 · 011 T012/T040 · 012 T008/T036 · 014 T038. FR-013 com `[sem teste]` legítimo (tela).
- Cenários de aceite H1 (1-7), H2 (1-4), H3 (1-6) mapeiam para tarefas de teste; as dispensas de teste são só de tela.
- Dependências entre tarefas válidas (fora o item bloqueante), sem ID duplicado, toda história com fase.
- Entidades da spec (Exercício, Ficha, Dia, Item) estão no modelo de dados do plan; nenhuma tarefa cria entidade fora dele.
- Constituição: princípios I, II, IV, V tratados; tarefa de segurança (T051); decisões todas com "Decidida por"; seção Proporção presente.
- Contratos: `fichas/C-01`, `C-02`, `C-03` existem em `_sistema/`; T050 os aplica na fase final; `autenticacao/C-01` (404 para dono alheio, 403 para papel) consumido como no contrato.
- `BOARD.md` ainda cita "carga" (T049 corrige, como a spec decidiu).

## Limitações

- A 001 não tem código nem está na `main`; os nomes provisórios (`users`, `teacher_id`, guards) ficam para T001. `sessoes.md` só consultado para consistência de C-01 (a 002 não o consome).
- `ARQUITETURA_DO_SISTEMA.md` não existe; sem contexto de código.
- A seção informativa `PROPORCAO` do script não rodou; a contagem de tarefas é manual.
