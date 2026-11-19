APROVADO

# Revisão da História 3 (diff 81e9ed0..HEAD, commit 1447b7b)

0 bloqueantes, 7 melhorias. Revisão por subagente (Opus) de contexto novo; ele não rodou a suíte (gate e
146 e2e rodados por quem implementou, antes do commit).

## Aderência

Todo cenário da História 3 e os FR-007, FR-009 a FR-012 e FR-014 têm teste que cobre o comportamento, em
`apps/api/test/fichas-edicao.e2e-spec.ts` e `exercicios.e2e-spec.ts`: PUT que chega ao aluno; trocar a
ativa arquiva a anterior, que segue legível; duplicar gera ficha independente; desativar some das novas
escolhas e fica nas fichas existentes; arquivada é só leitura (409 em PUT, ativar e arquivar) e duplicável;
tetos de 10 dias e 30 itens. Nenhum teste removido, pulado ou afrouxado; o teste da US2 que forçava
"arquivada" por `updateMany` passou a usar a rota real e ganhou uma asserção.

## Segurança e qualidade

Conforme: posse no servidor em toda rota nova, 404 igual para inexistente e de outro dono, nenhum
`@Public`; trava da ficha (`FOR UPDATE`) e dos exercícios (`FOR SHARE`) sem ciclo; PUT sem órfãos (cascata
em dia e item); exercício desativado só é aceito no PUT se já estava na ficha, sem brecha de posse.

## Melhorias

1. Duplicar copia exercício desativado; na cópia ele conta como "já na ficha". Regra não escrita na spec; registrar e testar (a corrigir no Polimento ou aceitar).
2. `PATCH /exercicios/:id` aceita `null` em nome, unidade e ativo (`@IsOptional` ignora `null`) e devolve 500; recusar com 400 e testar.
3. Arquivar e duplicar só comparam o 404 de outro dono, não com id inexistente.
4. Duplicar lê a original fora de transação; uma edição concorrente poderia gerar cópia com dia sem item (a ativação revalida).
5. PATCH checa a posse e atualiza em dois passos; `updateMany` com `teacherId` deixaria a posse na escrita.
6. `travarExerciciosAtivos` é função solta fora do provider do módulo (princípio IV).
7. "Salvar e ativar" de rascunho no front é PUT e depois ativar; falha parcial deixa o rascunho salvo e a tela mostra o erro.
