APROVADO

# Revisão da História 1 (diff bb1d238..HEAD)

0 bloqueantes, 7 melhorias. Revisão por subagente de contexto novo; ele leu o diff e os arquivos e
não rodou o gate nem os e2e (o gate e os 101 e2e foram rodados por quem implementou, antes do commit).

## Aderência

Todo cenário de regra da História 1 tem teste que cobre o comportamento descrito:

- Cenário 1 (cadastrar exercício): `apps/api/test/exercicios.e2e-spec.ts`.
- Cenário 2 (nome duplicado sem diferença de maiúsculas): `exercicios.e2e-spec.ts`.
- Cenário 3 (ficha A–E ativa, na ordem): `apps/api/test/fichas.e2e-spec.ts` e `ficha-validation.spec.ts`.
- Cenário 4 (faixa e séries inválidas): unidade, e2e (400 sem gravar) e `fichas-db.e2e-spec.ts`.
- Cenário 5 (sem dia ou dia sem item não ativa): unidade e e2e nos dois caminhos.
- Cenário 6 (força e cardio misturados): e2e, unidade e banco.
- Cenário 7 (aluno de outro professor): 404 igual a inexistente, em `fichas.e2e-spec.ts`.
- FR-005, FR-006 e FR-011 cobertos; FR-013 é `[sem teste]`.
- Nenhum teste removido, pulado ou afrouxado.

## Qualidade e segurança

Conforme: nenhuma rota nova é `@Public`; `@Roles('PROFESSOR')` na classe; guards globais valem
(conta provisória leva 403 por construção); posse checada no service com o id do token; exercício
de cada item conferido contra o catálogo ativo do próprio professor. A migration traz o único
`lower(name)`, o índice parcial de uma ativa por aluno e o `CHECK` por tipo, todos com teste.

## Melhorias (não bloqueiam; sem nova rodada)

1. `fichas.service.ts` (`ativar`): hoje reativa ficha arquivada, contra FR-014. Teste e correção são o T042 (US3).
2. Migration: faltam `CHECK`s de defesa em profundidade (`position >= 1`, `range_min >= 1`, `sets <= 100`, nome não vazio).
3. A posse de `plans.teacher_id` e de `plan_items.exercise_id` só vale no service, sem garantia do banco.
4. A checagem de exercício disponível roda fora da transação; revisar quando existir a rota de desativar (US3).
5. `seed.ts` só se recusa com `NODE_ENV=production`; considerar segunda trava (host local ou `ALLOW_SEED=1`).
6. Teste "ativar a que já está ativa não muda nada" só confere status e estado; comparar corpo antes e depois.
7. Teste duplicado entre unidade e e2e; `rejects.toThrow()` sem padrão em `fichas-db.e2e-spec.ts`; tetos e rótulo repetidos no web (declarado como espelho).
