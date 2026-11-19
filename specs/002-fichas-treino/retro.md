# Retro: 002-fichas-treino

| Medida | Valor |
|---|---|
| Spec criada em → implementação fechada em | 2026-11-17 → 2026-11-18 (2 dias; PR ainda não aberta, espera o sim do dono) |
| Histórias | 3 |
| Rodadas de análise | 3 (bloqueantes por rodada: 1, 0, 3; a 3ª foi pós-merge da 001, focada em autenticação; os 3 eram mecânicos, de nomes e caminhos) |
| Execuções do gate (passou / falhou) | 1 / 0 no log do hook (`gates-002.jsonl`); o gate e os e2e também foram rodados à mão antes de cada commit de história, todos verdes |
| Revisões de história reprovadas | 0 (as três aprovadas na 1ª rodada, com 7, 4 e 7 melhorias) |
| Testes novos (rápidos / lentos) | 17 de unidade / 90 e2e (suíte: 40 e 147) |
| Uso do plano (início → fim), se anotado | não anotado |

## O que travou

- **Tasks escritos antes da 001 ter código.** Nomes de fixture, caminho do helper, `@Roles` com string e seed
  inexistente só apareceram na análise pós-merge (3 bloqueantes mecânicos). Esperar o código da 001 teria evitado.
- **Aluno nasce com senha provisória.** Todo e2e de aluno falharia pelo motivo errado; a fixture precisou trocar a
  senha antes.
- **Corridas reais em Postgres.** Duas ativações simultâneas davam 500 antes do índice parcial barrar (resolvido com
  `FOR UPDATE` na linha do aluno), e desativar exercício × salvar ficha exigiu `FOR SHARE` dentro da transação.
  Ambas provadas removendo a trava e vendo o teste falhar.
- **`PATCH` com `null`** passava pelo `@IsOptional` e virava 500; achado da revisão da US3, corrigido no Polimento.
- **Ambiente.** `pnpm` fora do PATH do bash; o filtro `test:e2e -- <arquivo>` roda a suíte inteira (a suíte e2e leva
  2 a 6 minutos). O Postgres da 001 já estava de pé, então não subi outro.
- **Capturas.** O navegador embutido tinha sessão antiga e o login em `127.0.0.1` vazou senha de conta fictícia na URL
  do histórico; contas apagadas, mas o histórico do navegador embutido merece limpeza.

## Riscos aceitos e pendências

- Token de acesso do aluno vale até 15 minutos depois de o professor redefinir a senha dele (risco da 001).
- `constitution/stack.md` e `workflow.md` ainda dizem Jest e ESLint; a emenda é do dono. A 002 registrou a mesma exceção.
- Melhorias abertas das revisões: US1 (CHECKs de defesa em profundidade, posse só no service, teste duplicado), US2
  (`professorId` na resposta ao aluno), US3 (duplicar copia exercício desativado, leitura da original fora de transação,
  `travarExerciciosAtivos` fora do provider, "salvar e ativar" não atômico no front).
- FR-009 "mesmo com sessões já registradas" só se prova na 003; o `PUT` troca ids de dia e item (plan, Riscos).
- A CI não rodou (precisa de push).

## O que mudaria no método

- Gerar tasks só depois do merge da dependência que define nomes e fixtures, ou deixar a Fundação como tarefa de
  conferência (T001 fez isso, mas tarde demais para as tarefas já escritas).
- Pedir ao subagente implementador que grave a evidência da prova de trava (remover e ver falhar) no `tasks.md`.
