# Contratos: Autenticação e posse do dado

**Atualizado em**: 2026-11-18 pela `001-contas-acesso`, que implementou os três contratos.

## [C-01] Papéis e posse do dado

**Usado por**: todas as features com rota de API (001, 002, 003, 004, 006).

Toda pessoa tem uma conta com exatamente um papel: **professor** ou **aluno**. Não há
auto-cadastro nem papel admin.

**Regras**:

- Toda rota exige usuário autenticado, salvo as marcadas como públicas: login, renovação da
  sessão, logout e verificação de saúde. O logout vale pelo cookie de renovação, mesmo com o
  token de acesso vencido.
- Rota restrita a um papel recusa o outro papel com "sem permissão" (403).
- Sem autenticação, ou com token de acesso inválido ou vencido: "não autenticado" (401).
- Todo aluno pertence a um professor. O aluno lê e altera só o que é dele; o professor lê e
  altera só os alunos dele e o que pertence a esses alunos.
- Dado de outro dono responde "não encontrado" (404), igual a dado inexistente: a API não revela
  que ele existe.
- A posse é checada na API, em toda rota que lê ou altera dado de usuário; o front não decide
  autorização.
- Professor só nasce por comando administrativo, fora da API (`pnpm --filter api cli
  criar-professor`). O comando pode criar mais de um professor e, com confirmação explícita
  (`--redefinir`), troca a senha de um que já existe, derrubando as sessões dele. Ele recusa
  e-mail que pertence a um aluno.

**Na API**: guard global de autenticação com `@Public()` para as exceções; `@Roles()` para papel;
a posse é filtrada no service (ex.: `teacher_id = usuário logado`).

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta. 2026-11-18 `001-contas-acesso`
— logout entra nas exceções públicas; o comando também redefine senha e cria mais de um professor.

## [C-02] Conta do aluno

**Usado por**: `001-contas-acesso` (cria), `002` e `003` (o aluno é dono das fichas e sessões).

**Regras**:

- Só o professor cria a conta do aluno, com nome e e-mail; o aluno fica vinculado a esse
  professor.
- A **senha provisória é gerada pelo sistema** e devolvida uma única vez, na resposta da criação
  e da redefinição; o professor não a escolhe e ela não é consultável depois.
- O professor pode **redefinir a senha** de um aluno dele: nova provisória, a anterior deixa de
  valer e as sessões do aluno caem.
- E-mail é único no sistema, sem diferença entre maiúsculas e minúsculas e ignorando espaços nas
  pontas (gravado já normalizado).
- Conta com senha provisória só consegue trocar a senha, consultar a própria conta, renovar a
  sessão e sair: qualquer outra rota responde "sem permissão" (403) até a troca. Rota nova que
  deva ficar acessível nesse estado leva `@PermiteSenhaProvisoria()`; o padrão é negar.
- **Regra de senha**: de 8 a 128 caracteres. A troca exige a senha atual e uma nova diferente
  dela; ao trocar, a senha vira definitiva.
- Trocar ou redefinir a senha derruba as sessões da conta (quem trocou recebe uma sessão nova).
- Senha guardada só como hash argon2id; nunca devolvida (salvo a provisória, uma vez) nem
  registrada em log.

**Rotas**: `POST /api/alunos`, `GET /api/alunos`, `POST /api/alunos/{id}/redefinir-senha`
(professor); `POST /api/auth/trocar-senha` (qualquer conta autenticada).

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta. 2026-11-18 `001-contas-acesso`
— provisória gerada pelo sistema, redefinição pelo professor, rotas liberadas à conta provisória,
regra de senha e queda das sessões.

## [C-03] Sessão de acesso

**Usado por**: `apps/api` (emite e valida) e `apps/web` (guarda e renova).

**Regras**:

- Login por e-mail e senha. Erro de login não diz se o e-mail existe.
- Login limitado a 5 tentativas por minuto por origem (429), sem bloquear a conta.
- O front e a API ficam na **mesma origem**: o front repassa `/api` para a API.
- **Token de acesso**: JWT de 15 minutos, enviado em `Authorization: Bearer`; o front guarda só
  em memória. Carrega o id do usuário (`sub`), o papel (`role`) e a marca de senha provisória
  (`mcp`).
- **Token de renovação**: 7 dias, recontados a cada renovação, em cookie `ft_refresh`
  `httpOnly`, `Secure`, `SameSite=Strict`, restrito a `/api/auth` (renovação e logout);
  guardado no servidor só como hash.
- Várias sessões simultâneas por conta são permitidas (um login por aparelho).
- Cada renovação gira o token: o antigo deixa de valer e um novo é emitido.
- Reuso de um token de renovação já girado revoga a família inteira (todas as sessões
  derivadas daquele login), e o usuário precisa entrar de novo.
- Logout revoga a sessão do aparelho (a família do token apresentado), sem afetar as outras.
- Um token de acesso já emitido continua valendo até vencer (no máximo 15 minutos) depois de um
  logout, de uma troca ou de uma redefinição de senha: a revogação age sobre a renovação.

**Rotas**: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`,
`GET /api/auth/me`.

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta. 2026-11-18 `001-contas-acesso`
— limite de login, mesma origem, claim `mcp`, cookie válido para renovação e logout, várias
sessões por conta.
