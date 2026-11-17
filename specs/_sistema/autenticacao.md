# Contratos: Autenticação e posse do dado

**Atualizado em**: 2026-11-17 pela PR do roteiro (descoberta). A `001-contas-acesso` implementa e
ajusta aqui o que mudar na entrevista dela.

## [C-01] Papéis e posse do dado

**Usado por**: todas as features com rota de API (001, 002, 003, 004, 006).

Toda pessoa tem uma conta com exatamente um papel: **professor** ou **aluno**. Não há
auto-cadastro nem papel admin.

**Regras**:

- Toda rota exige usuário autenticado, salvo as marcadas como públicas (login, renovação da
  sessão, verificação de saúde).
- Rota restrita a um papel recusa o outro papel com "sem permissão" (403).
- Sem autenticação, ou com token de acesso inválido ou vencido: "não autenticado" (401).
- Todo aluno pertence a um professor. O aluno lê e altera só o que é dele; o professor lê e
  altera só os alunos dele e o que pertence a esses alunos.
- Dado de outro dono responde "não encontrado" (404), igual a dado inexistente: a API não revela
  que ele existe.
- A posse é checada na API, em toda rota que lê ou altera dado de usuário; o front não decide
  autorização.
- O primeiro professor (o dono) é criado por comando administrativo, fora da API.

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta.

## [C-02] Conta do aluno

**Usado por**: `001-contas-acesso` (cria), `002` e `003` (o aluno é dono das fichas e sessões).

**Regras**:

- Só o professor cria a conta do aluno, com nome, e-mail e senha provisória; o aluno fica
  vinculado a esse professor.
- E-mail é único no sistema, sem diferença entre maiúsculas e minúsculas.
- Conta com senha provisória só consegue trocar a senha: qualquer outra rota responde "sem
  permissão" (403) até a troca.
- Senha guardada só como hash argon2; nunca devolvida nem registrada em log.

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta.

## [C-03] Sessão de acesso

**Usado por**: `apps/api` (emite e valida) e `apps/web` (guarda e renova).

**Regras**:

- Login por e-mail e senha. Erro de login não diz se o e-mail existe.
- **Token de acesso**: JWT de 15 minutos, enviado em `Authorization: Bearer`; o front guarda só
  em memória. Carrega o id do usuário e o papel.
- **Token de renovação**: 7 dias, em cookie `httpOnly`, `Secure`, `SameSite=Strict`, restrito à
  rota de renovação; guardado no servidor só como hash.
- Cada renovação gira o token: o antigo deixa de valer e um novo é emitido.
- Reuso de um token de renovação já girado revoga a família inteira (todas as sessões
  derivadas daquele login), e o usuário precisa entrar de novo.
- Logout revoga o token de renovação atual.

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta.
