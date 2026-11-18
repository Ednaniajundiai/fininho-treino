APROVADO

# Revisão da História 2 (diff 54787b1..HEAD)

0 bloqueantes, 4 melhorias. Revisão por subagente de contexto novo; ele não rodou a suíte (o gate e os
111 e2e foram rodados por quem implementou, antes do commit 3af0b4d).

## Aderência

- Cenário 1 (aluno vê a ficha como prescrita): `apps/api/test/minha-ficha.e2e-spec.ts`, compara com o `GET /fichas/:id` do professor e com a estrutura literal.
- Cenário 2 (sem ficha ativa): API devolve `{ ficha: null }` sem ficha, só rascunho ou só arquivada; o aviso da tela é validação manual (FR-013).
- Cenário 3 (aluno B não vê a de A): corpo sem id, nome ou exercício de A; aluno recebe 403 nas rotas do professor, sem alterar nada.
- Cenário 4 (aluno tenta criar ou editar): criar e ativar cobertos; o `PUT` ainda não existe e o 403 dele é do T034 (US3).
- Extras: 401 sem token e com token inválido; 403 para professor; 403 para aluno com senha provisória.
- Nenhum teste removido, pulado ou afrouxado.

## Segurança e qualidade

Conforme: `@Roles('ALUNO')`, sem `@Public` nem `@PermiteSenhaProvisoria`; a rota não recebe id e usa o id do token; filtra `status: 'ACTIVE'`.

## Melhorias (sem nova rodada)

1. `FichaDto` devolvida ao aluno inclui `professorId`; não é vazamento (é o professor dele), mas um DTO de leitura menor evitaria o campo.
2. Dois testes de arquivada se sobrepõem e forçam o estado por `updateMany`; trocar pela rota real de arquivar quando a US3 existir.
3. `ativaDoAluno` não filtra por professor: correto porque a ativa é única por aluno; vale comentário ou teste apontando essa restrição.
4. O aviso de ficha vazia foi capturado só em 390px claro; completar as outras combinações antes de fechar a feature.
