# Spec: Contas e acesso

**Branch / pasta**: `001-contas-acesso` | **Criada em**: 2026-11-17 | **Status**: Aprovado em 2026-11-17

## Problema

O fininho-treino ainda não existe como sistema: não há onde entrar, nem como saber quem é
professor e quem é aluno. Tudo o que vem depois (ficha, sessão, cruzamento com o relógio) é dado
de saúde e de rotina de uma pessoa, e só pode ser visto por ela e pelo professor dela. Hoje o
dono guarda a ficha num arquivo e não há como um aluno ter a sua.

Esta feature põe o sistema de pé e resolve o acesso: o dono cria a própria conta de professor por
um comando administrativo, entra, cria as contas dos alunos dele e cada aluno entra com uma senha
provisória que é obrigado a trocar. Ninguém se cadastra sozinho.

## Escopo

### Dentro do escopo (este ciclo)

- Base do projeto: o sistema sobe no ambiente de desenvolvimento pelos comandos do README e toda proposta
  de mudança passa por verificação automática.
- Comando administrativo que cria uma conta de professor ou redefine a senha de uma que já existe.
- Entrar, manter a sessão, sair.
- Professor cria a conta do aluno, vê a lista dos alunos dele e redefine a senha de um aluno.
- Troca obrigatória da senha provisória.
- Telas: entrar, troca de senha obrigatória, alunos (lista, criar, redefinir senha) e tela
  inicial mínima por papel.

### Fora do escopo (explicitamente)

- Auto-cadastro e papel admin.
- Convite ou recuperação de senha por e-mail.
- Desativar ou apagar conta; editar nome e e-mail do aluno.
- Troca de senha voluntária (fora da provisória) e tela de perfil.
- Transferir aluno de professor.
- Fichas, sessões e integração com o relógio (features 002 a 004); deploy em produção (005).

## Histórias de Usuário e Cenários *(obrigatório)*

### História 1 - O dono cria a conta de professor e entra (Prioridade: P1)

O dono roda o comando administrativo, informa nome, e-mail e senha, e passa a conseguir entrar no
sistema. A sessão se mantém enquanto ele usa e termina quando ele sai.

**Por que esta prioridade**: sem conta e sem login nada mais é alcançável; esta história também
põe o sistema de pé.

**Teste independente**: num ambiente limpo, subir o sistema, rodar o comando, entrar pela tela,
recarregar a página (continua dentro) e sair.

**Cenários de aceite**:

1. **Dado** um sistema sem contas, **Quando** o dono roda o comando com nome, e-mail e senha
   válidos, **Então** existe uma conta de professor com senha definitiva.
2. **Dado** um professor já criado, **Quando** o comando roda de novo com o mesmo e-mail e a
   confirmação de redefinir, **Então** a senha passa a ser a nova e as sessões abertas dessa
   conta caem.
3. **Dado** um professor criado, **Quando** ele informa e-mail e senha corretos na tela de
   entrar, **Então** entra e vê a tela inicial de professor.
4. **Dado** e-mail inexistente ou senha errada, **Quando** tenta entrar, **Então** recebe a mesma
   mensagem "e-mail ou senha inválidos" nos dois casos.
5. **Dado** alguém que errou o login 5 vezes em um minuto, **Quando** tenta de novo, **Então**
   recebe "muitas tentativas, tente de novo em instantes", sem bloqueio da conta.
6. **Dado** um usuário logado há mais de 15 minutos, **Quando** continua usando, **Então** a
   sessão é renovada sem pedir a senha, por até 7 dias desde a última renovação.
7. **Dado** um usuário logado, **Quando** sai, **Então** a sessão daquele aparelho deixa de valer
   e a tela de entrar aparece.
8. **Dado** uma credencial de renovação já usada, **Quando** alguém a apresenta de novo,
   **Então** todas as sessões derivadas daquele login caem e é preciso entrar de novo.
9. **Dado** alguém sem sessão, **Quando** chama qualquer operação que não seja entrar, renovar
   ou a verificação de saúde, **Então** recebe "não autenticado".

---

### História 2 - O professor cria e acompanha as contas dos alunos (Prioridade: P2)

O professor informa nome e e-mail do aluno; o sistema cria a conta vinculada a ele, gera uma
senha provisória e a mostra uma única vez, para ele repassar. Ele vê a lista dos alunos dele e
pode gerar nova senha provisória para quem esqueceu.

**Teste independente**: logado como professor, criar um aluno, ver a senha provisória uma vez,
ver o aluno na lista; com um segundo professor, confirmar que um não vê os alunos do outro.

**Cenários de aceite**:

1. **Dado** um professor logado, **Quando** cria um aluno com nome e e-mail válidos, **Então** a
   conta existe vinculada a ele, e a senha provisória aparece uma única vez.
2. **Dado** um e-mail já usado por qualquer conta (com outra caixa de letras), **Quando** o
   professor tenta criar, **Então** recebe "e-mail já cadastrado" e nada é criado.
3. **Dado** dois professores com alunos, **Quando** um lista os alunos, **Então** vê só os dele.
4. **Dado** um aluno do professor, **Quando** o professor redefine a senha, **Então** uma nova
   provisória aparece uma única vez, a antiga deixa de valer e as sessões do aluno caem.
5. **Dado** um aluno de outro professor, **Quando** o professor tenta redefinir a senha dele,
   **Então** recebe "não encontrado", igual a aluno inexistente.
6. **Dado** um aluno logado, **Quando** tenta criar, listar ou redefinir alunos, **Então** recebe
   "sem permissão".

---

### História 3 - O aluno troca a senha provisória (Prioridade: P3)

O aluno entra com a senha provisória e cai direto na troca de senha. Só depois de trocar ele usa
o sistema.

**Teste independente**: entrar com a provisória, tentar outra tela (é levado à troca), trocar a
senha e chegar à tela inicial de aluno; sair e entrar com a nova.

**Cenários de aceite**:

1. **Dado** um aluno com senha provisória, **Quando** entra, **Então** é levado à troca de senha.
2. **Dado** uma conta com senha provisória, **Quando** chama qualquer operação que não seja
   trocar a senha, consultar a própria conta, renovar a sessão ou sair, **Então** recebe "sem
   permissão".
3. **Dado** a troca com a provisória correta e uma nova senha válida e diferente dela, **Quando**
   confirma, **Então** a senha vira definitiva, as outras sessões da conta caem e ele segue
   logado para a tela inicial de aluno.
4. **Dado** uma nova senha com menos de 8 caracteres, ou igual à provisória, **Quando** confirma,
   **Então** a troca é recusada com o motivo.

---

### Casos de Borda

- Comando administrativo com e-mail que pertence a um aluno: recusa, sem alterar a conta.
- Comando administrativo com e-mail de professor existente e sem a confirmação de redefinir:
  recusa e avisa que a conta já existe.
- Mesma conta em dois aparelhos: permitido; sair de um não derruba o outro.
- Credencial de renovação vencida (mais de 7 dias sem uso): "não autenticado", volta a entrar.
- E-mail com espaços nas pontas ou letras maiúsculas: tratado como o mesmo e-mail.
- Senha com mais de 128 caracteres: recusada.

## Requisitos Funcionais *(obrigatório)*

- **FR-001**: [sem teste: configuração de ambiente; prova pelo roteiro do SC-001] O sistema
  DEVE subir no ambiente de desenvolvimento seguindo só os comandos do README e responder a uma
  verificação de saúde pública. *(História 1)*
- **FR-002**: [sem teste: configuração da verificação; a prova é a execução na PR] Toda proposta
  de mudança DEVE passar por verificação automática de estilo, tipos, testes e build antes de
  poder entrar. *(História 1)*
- **FR-003**: O comando administrativo DEVE criar uma conta de professor com nome, e-mail e senha
  definitiva, sem passar pela API. *(História 1)*
- **FR-004**: O comando administrativo DEVE redefinir a senha de um professor existente só com
  confirmação explícita, derrubando as sessões dele; e DEVE recusar e-mail que pertence a um
  aluno. *(História 1)*
- **FR-005**: O sistema DEVE autenticar por e-mail e senha e responder com a mesma mensagem para
  e-mail inexistente e senha errada. *(História 1)*
- **FR-006**: O sistema DEVE limitar as tentativas de login a 5 por minuto por origem, sem
  bloquear a conta. *(História 1)*
- **FR-007**: A sessão DEVE ter acesso de 15 minutos e renovação de 7 dias; cada renovação
  invalida a credencial anterior e emite outra. *(História 1)*
- **FR-008**: O reuso de uma credencial de renovação já usada DEVE derrubar todas as sessões
  derivadas do mesmo login. *(História 1)*
- **FR-009**: Sair DEVE invalidar a sessão do aparelho, sem afetar outros aparelhos.
  *(História 1)*
- **FR-010**: Toda operação DEVE exigir usuário autenticado, exceto entrar, renovar a sessão e a
  verificação de saúde. *(História 1)*
- **FR-011**: O usuário autenticado DEVE conseguir consultar a própria conta (nome, e-mail,
  papel e se a senha é provisória). *(História 1)*
- **FR-012**: Só professor DEVE conseguir criar conta de aluno, com nome e e-mail; o aluno fica
  vinculado a quem o criou; aluno recebe "sem permissão". *(História 2)*
- **FR-013**: O sistema DEVE gerar a senha provisória e mostrá-la uma única vez, na criação e na
  redefinição; ela nunca é consultável depois. *(História 2)*
- **FR-014**: O e-mail DEVE ser único no sistema, sem diferença de maiúsculas e ignorando
  espaços nas pontas. *(História 2)*
- **FR-015**: O professor DEVE ver só os alunos dele. *(História 2)*
- **FR-016**: O professor DEVE conseguir redefinir a senha de um aluno dele, o que invalida a
  anterior e derruba as sessões do aluno; para aluno de outro professor a resposta é "não
  encontrado". *(História 2)*
- **FR-017**: Conta com senha provisória DEVE receber "sem permissão" em qualquer operação que
  não seja trocar a senha, consultar a própria conta, renovar a sessão ou sair. *(História 3)*
- **FR-018**: A troca de senha DEVE exigir a senha atual e uma nova de 8 a 128 caracteres,
  diferente da atual; ao trocar, a senha vira definitiva e as outras sessões da conta caem.
  *(História 3)*
- **FR-019**: A senha DEVE ser guardada só de forma irreversível e nunca aparecer em resposta
  (salvo a provisória, uma vez) nem em registro de log. *(Histórias 1 a 3)*
- **FR-020**: [sem teste: tela, validação manual com captura] As telas de entrar, troca de
  senha, alunos e inicial por papel DEVEM existir, com a tela inicial dizendo que as fichas
  aparecem ali. *(Histórias 1 a 3)*

### Entidades-Chave

- **Conta**: uma pessoa no sistema, com nome, e-mail único, papel (professor ou aluno), senha e
  a marca de senha provisória. Conta de aluno pertence a exatamente um professor.
- **Sessão de acesso**: o vínculo de um login num aparelho, renovável por 7 dias; as renovações
  de um mesmo login formam uma família, que cai inteira em caso de reuso.

## Critérios de Sucesso *(obrigatório)*

- **SC-001**: Num clone limpo do repositório, seguindo só o README, o sistema sobe, o comando
  cria o professor, ele entra, cria um aluno, o aluno entra com a provisória e troca a senha.
- **SC-002**: A verificação automática fica verde na PR desta feature.
- **SC-003**: Toda operação da API tem prova automatizada de que recusa quem não está
  autenticado, quem tem o papel errado e quem não é dono do dado.

## Restrições

- Stack obrigatória: a da constituição (decisão didática declarada).
- Integrações existentes que não podem quebrar: não se aplica (primeira feature).
- LGPD / dados sensíveis: só contas fictícias em seed, teste, exemplo e captura de tela; e-mail e
  nome são dado pessoal; senha, credencial de sessão e seus derivados nunca em log.
- Performance / disponibilidade: não se aplica (volume baixo, sem meta).

## Suposições e perguntas em aberto

- O dono delegou as respostas da entrevista ("siga com o que for ideal"): as escolhas desta spec
  são recomendações aceitas, e ele as confirma ou muda na aprovação.
- Senha provisória não vence por tempo: vale até ser trocada ou redefinida.
- O limite de tentativas de login é por origem da requisição; não há bloqueio por conta.
- Sem pendências bloqueantes.

## Contratos tocados

- **MODIFICADO** `autenticacao/C-01`: a lista de exceções públicas e o comando administrativo
  ganham detalhe: o comando também redefine a senha de professor e pode criar mais de um.
- **MODIFICADO** `autenticacao/C-02`: a senha provisória passa a ser gerada pelo sistema e
  mostrada uma única vez (o professor não a escolhe); o professor pode redefini-la; conta com
  senha provisória pode, além de trocar a senha, consultar a própria conta, renovar a sessão e
  sair; regra de senha de 8 a 128 caracteres; trocar ou redefinir a senha derruba as sessões.
- **MODIFICADO** `autenticacao/C-03`: várias sessões simultâneas por conta são permitidas;
  limite de 5 tentativas de login por minuto por origem; o front e a API ficam na mesma origem;
  o cookie de renovação vale para a renovação e para o logout (não só para a renovação).

## Exceções à Constituição

- Sem exceções — segue a constituição integralmente.

---

## Notas técnicas para o plan

- Do roteiro: monorepo com pnpm workspaces, Docker Compose em desenvolvimento, GitHub Actions.
- Da descoberta: JWT de 15 min em `Authorization: Bearer`, guardado só em memória no front;
  refresh de 7 dias em cookie `httpOnly`, `Secure`, `SameSite=Strict`, restrito à rota de
  renovação, com hash no servidor; argon2; guard global com `@Public()`; `@Roles()`.
- Ambiente do dono no início da feature: Node 22.14 e sem pnpm instalado.
