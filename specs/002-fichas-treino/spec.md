# Spec: Fichas de treino

**Branch / pasta**: `002-fichas-treino` | **Criada em**: 2026-11-17 | **Status**: Rascunho

## Problema

Hoje a ficha de treino do dono vive em texto solto (a rotação A–E do `fininho-health`) e não
chega ao aluno de forma estruturada. O professor precisa montar a ficha de cada aluno — dias em
rotação, exercícios, séries, faixa de repetições (ou segundos) e cardio — e o aluno precisa abrir
o app e ver exatamente o que foi prescrito, sem ver a ficha de ninguém mais. Sem essa estrutura,
a feature seguinte (registro da sessão) não tem o que registrar.

## Escopo

### Dentro do escopo (este ciclo)

- Catálogo de exercícios por professor (nome e unidade padrão).
- Professor monta a ficha de um aluno: dias em rotação (A, B, C…), itens de força e de cardio,
  em ordem.
- Atribuição: uma ficha ativa por aluno; ativar outra arquiva a anterior.
- Aluno vê a ficha ativa dele.
- Professor edita, arquiva e duplica fichas (do mesmo aluno ou de outro aluno dele).
- Ordem dos dias da ficha ativa como base da rotação (`fichas/C-03`).

### Fora do escopo (explicitamente)

- Carga-alvo prescrita na ficha: a carga só existe no registro da sessão (003).
- Registro de sessão, histórico, "próximo dia" calculado e sugestão de carga (003).
- Grupo muscular, vídeo ou imagem do exercício.
- Catálogo compartilhado entre professores.
- Aluno ver fichas arquivadas diretamente (aparecem pelo histórico de sessões, na 003).
- Fases de adaptação automáticas: o professor edita a ficha.

## Histórias de Usuário e Cenários *(obrigatório)*

### História 1 - Professor cadastra exercícios e monta a ficha de um aluno (Prioridade: P1)

O professor cadastra exercícios no catálogo dele (nome e unidade padrão: repetições ou
segundos), cria uma ficha para um aluno dele, adiciona dias com título e, em cada dia, itens de
força (exercício, séries, faixa mínima e máxima, unidade) e de cardio (modalidade, duração
mínima e máxima em minutos), na ordem que quiser, e a ativa.

**Por que esta prioridade**: sem ficha montada não há o que o aluno ver nem registrar; é o MVP.

**Teste independente**: com um professor e um aluno vinculados, montar uma ficha A–E mista e
conferir que ela é gravada na ordem definida e fica ativa.

**Cenários de aceite**:

1. **Dado** um professor autenticado, **Quando** cadastra o exercício "Supino reto" com unidade repetições, **Então** ele aparece no catálogo dele.
2. **Dado** um nome já existente no catálogo (sem diferença de maiúsculas), **Quando** o professor cadastra de novo, **Então** o sistema recusa por duplicidade.
3. **Dado** um aluno do professor, **Quando** ele monta uma ficha com dias A–E, cada dia com ao menos um item, e a ativa, **Então** a ficha fica ativa com dias e itens na ordem definida.
4. **Dado** um item de força com faixa mínima maior que a máxima, ou séries menor que 1, **Quando** o professor salva, **Então** o sistema recusa e diz o motivo.
5. **Dado** uma ficha sem dia, ou um dia sem item, **Quando** o professor tenta ativá-la, **Então** o sistema recusa.
6. **Dado** um dia com itens de força e de cardio, **Quando** salva, **Então** os dois tipos coexistem na ordem escolhida.
7. **Dado** um aluno de outro professor, **Quando** o professor tenta criar ficha para ele, **Então** a resposta é "não encontrado".

---

### História 2 - Aluno vê a ficha ativa (Prioridade: P2)

O aluno entra e vê a ficha ativa dele: dias na ordem, itens com séries, faixa e unidade, ou
modalidade e duração, e observações. Só vê exercícios que estão na ficha dele.

**Por que esta prioridade**: fecha o valor da feature (o aluno sabe o que fazer), mas depende da P1.

**Teste independente**: com uma ficha ativa atribuída, entrar como o aluno e conferir que o que
aparece é igual ao prescrito; entrar como outro aluno e não ver nada dessa ficha.

**Cenários de aceite**:

1. **Dado** um aluno com ficha ativa, **Quando** abre a ficha, **Então** vê todos os dias e itens exatamente como prescritos.
2. **Dado** um aluno sem ficha ativa, **Quando** abre a ficha, **Então** vê um aviso de que ainda não há ficha.
3. **Dado** a ficha de outro aluno, **Quando** o aluno tenta acessá-la, **Então** a resposta é "não encontrado".
4. **Dado** um aluno, **Quando** tenta criar ou editar ficha, **Então** a resposta é "sem permissão".

---

### História 3 - Professor edita, arquiva, troca e duplica a ficha (Prioridade: P3)

O professor ajusta a ficha ativa (dias, itens, faixas), arquiva, ativa outra no lugar, ou cria
uma ficha nova duplicando qualquer ficha dele (do mesmo aluno ou de outro).

**Por que esta prioridade**: é o dia a dia do professor, mas a primeira ficha já entrega valor sem isso.

**Teste independente**: editar uma ficha ativa e ver a mudança refletida para o aluno; ativar
outra e ver a anterior arquivada.

**Cenários de aceite**:

1. **Dado** uma ficha ativa, **Quando** o professor altera as séries de um item, **Então** o aluno vê o valor novo.
2. **Dado** uma ficha ativa, **Quando** o professor ativa outra do mesmo aluno, **Então** a anterior fica arquivada e continua legível.
3. **Dado** uma ficha qualquer do professor, **Quando** ele a duplica para outro aluno dele, **Então** nasce uma ficha nova, independente, com os mesmos dias e itens.
4. **Dado** um exercício em uso numa ficha, **Quando** o professor o remove do catálogo, **Então** ele é desativado e some das novas escolhas, sem sumir das fichas existentes.
5. **Dado** uma ficha arquivada, **Quando** o professor tenta editá-la, **Então** o sistema recusa. *(ver Pendente 2)*

---

### Casos de Borda

- Número de dias livre (mínimo 1); rótulos em sequência A, B, C… mesmo ao reordenar ou remover dias.
- Remover o último item de um dia, ou o último dia de uma ficha ativa, é recusado.
- Exercício desativado continua aparecendo nas fichas que já o usam.
- Dois professores podem ter exercícios com o mesmo nome, cada um no seu catálogo.
- Professor arquiva a ficha ativa sem ativar outra: o aluno fica sem ficha ativa.

## Requisitos Funcionais *(obrigatório)*

- **FR-001**: O sistema DEVE permitir ao professor cadastrar exercícios no catálogo próprio, com nome e unidade padrão (repetições ou segundos). *(História 1)*
- **FR-002**: O sistema DEVE recusar nome de exercício duplicado no catálogo do mesmo professor, sem diferença de maiúsculas. *(História 1)*
- **FR-003**: O sistema DEVE permitir ao professor criar uma ficha para um aluno dele, com nome e dias em rotação (rótulo em sequência e título), em ordem definida por ele. *(História 1)*
- **FR-004**: O sistema DEVE permitir itens de força (exercício do catálogo, séries ≥ 1, faixa mínima ≤ máxima, unidade repetições ou segundos, observação opcional) e de cardio (modalidade esteira, bike, escada ou livre; duração mínima ≤ máxima em minutos; observação opcional), em ordem, podendo misturar tipos no mesmo dia. *(História 1)*
- **FR-005**: O sistema DEVE exigir ao menos um dia por ficha e ao menos um item por dia para ativá-la. *(História 1)*
- **FR-006**: O sistema DEVE manter no máximo uma ficha ativa por aluno; ativar outra DEVE arquivar a anterior, que continua legível. *(Histórias 1 e 3)*
- **FR-007**: O sistema DEVE restringir criação, edição, ativação, arquivamento, duplicação e catálogo ao professor dono, respondendo "não encontrado" para aluno ou ficha de outro professor e "sem permissão" para o papel aluno. *(Histórias 1, 2 e 3)*
- **FR-008**: O aluno DEVE conseguir ver a ficha ativa dele, com dias e itens como prescritos, e só os exercícios dessa ficha; sem ficha ativa, vê um aviso. *(História 2)*
- **FR-009**: O sistema DEVE permitir ao professor editar a ficha ativa livremente, mesmo com sessões já registradas. *(História 3)*
- **FR-010**: O sistema DEVE permitir ao professor arquivar uma ficha e duplicar qualquer ficha dele para qualquer aluno dele, gerando ficha nova independente. *(História 3)*
- **FR-011**: O sistema DEVE desativar, em vez de apagar, exercício usado em ficha ou sessão; desativado some das novas escolhas e continua nas fichas existentes. *(Histórias 1 e 3)*
- **FR-012**: O sistema DEVE guardar a ordem dos dias da ficha como base da rotação (`fichas/C-03`). *(Histórias 1 e 3)*
- **FR-013**: As telas DEVEM exibir a ficha e os formulários em português, adaptados ao celular. [sem teste: validação manual] *(Histórias 1 e 2)*

### Entidades-Chave

- **Exercício**: item do catálogo de um professor; nome único por professor, unidade padrão, ativo ou desativado.
- **Ficha**: prescrição de um professor para um aluno; nome, status ativa ou arquivada; tem dias.
- **Dia**: parte da rotação; rótulo em sequência, título, ordem; tem itens.
- **Item**: linha do dia, em ordem; de força (exercício, séries, faixa, unidade) ou de cardio (modalidade, duração mínima e máxima); observação opcional.

## Critérios de Sucesso *(obrigatório)*

- **SC-001**: O professor monta e ativa uma ficha A–E completa, com força e cardio, para um aluno dele, sem apoio externo.
- **SC-002**: O aluno entra e vê exatamente o que foi prescrito, e nunca vê ficha de outro aluno.
- **SC-003**: Trocar a ficha ativa de um aluno deixa a anterior arquivada e legível, com zero fichas ativas duplicadas.

## Restrições

- Stack obrigatória: a da constituição (decidida no plan).
- Integrações existentes que não podem quebrar: contas e papéis da `001` (`autenticacao/C-01`).
- LGPD / dados sensíveis: repositório público, só dados fictícios; catálogo começa vazio em produção; seed de desenvolvimento com exercícios genéricos fictícios.
- Performance / disponibilidade: não se aplica.

## Suposições e perguntas em aberto

**Recomendações aceitas por delegação** (o dono respondeu "siga com o que for ideal"; ele ainda
pode mudar no portão da spec):

- Sem carga-alvo na ficha; a carga só existe no registro da sessão (003).
- Edição livre da ficha ativa; o histórico é protegido pela cópia da prescrição em `sessoes/C-01`.
- Ficha nova do zero ou duplicando qualquer ficha do próprio professor.
- Catálogo vazio em produção; exercício só com nome e unidade padrão, sem grupo muscular.
- Número de dias livre (mínimo 1); o aluno vê só a ficha ativa.

**Pendente** (nenhuma bloqueia a aprovação, mas pede decisão no portão ou no plan):

1. **Divergência BOARD × contrato**: a linha da 002 no `BOARD.md` cita "carga" na ficha; `fichas/C-01` não tem carga no item. Recomendação: manter sem carga e corrigir o BOARD na PR da 002.
2. **Ficha arquivada: editável ou só leitura?** A spec assume só leitura (cenário 3.5); a nota de respostas não cobre.
3. **Teto de dias e de itens**: assumido sem teto de negócio; limites técnicos ficam para o plan.

## Contratos tocados

- **MODIFICADO** `fichas/C-01`: sem mudança de formato; confirma que o item não tem carga, que a ficha arquivada é só leitura e que o professor edita a ficha ativa livremente. `003` e `006` consomem sem alteração.
- **MODIFICADO** `fichas/C-02`: sem mudança de regra; acrescenta que o catálogo começa vazio em produção e que o exercício não tem grupo muscular.
- **MODIFICADO** `fichas/C-03`: sem mudança de regra; a `002` fixa a ordem dos dias que a `003` usa para calcular o próximo dia.
- `autenticacao/C-01`: apenas consumido (papéis e posse), sem alteração.

**Divergência registrada**: o `BOARD.md` fala em "carga" na ficha e o contrato `fichas/C-01` não
tem carga no item. A recomendação é manter sem carga e corrigir o BOARD na PR da 002.

## Exceções à Constituição

- Sem exceções — segue a constituição integralmente (a confirmar no plan).

---

## Notas técnicas para o plan

- Código previsto em `apps/api/src/fichas` e `apps/web/app/fichas` (BOARD).
- Depende da `001` (contas, papéis e posse), ainda sem código: o plan só fecha depois dela.
- Seed de desenvolvimento com exercícios genéricos fictícios.
