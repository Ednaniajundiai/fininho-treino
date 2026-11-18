# Retro: 001-contas-acesso

| Medida | Valor |
|---|---|
| Spec criada em → implementação fechada em | 2026-11-17 → 2026-11-18 (2 dias; PR ainda não aberta, espera a validação local do dono) |
| Histórias | 3 |
| Rodadas de análise | 2 (bloqueantes por rodada: 1, 0) |
| Execuções do gate (passou / falhou) | sem log por hook (`.git/trilho/gates-001.jsonl` não existe); rodado à mão antes de cada commit, 1 falha (tipos velhos do `next dev`) |
| Revisões de história reprovadas | 1 (História 1, rodada 1: 2 bloqueantes; aprovada na rodada 2). Histórias 2 e 3 aprovadas na rodada 1 |
| Testes novos (rápidos / lentos) | 23 de unidade / 57 e2e |
| Uso do plano (início → fim), se anotado | não anotado |

## O que travou

- **A stack "estável atual" mudou de cara.** O NestJS 12 é só ESM e o esqueleto oficial vem com
  Vitest e oxlint; o `stack.md` dizia Jest e ESLint. Virou decisão do dono no meio da
  implementação (D-15) e exceção registrada na spec.
- **Ambiente da máquina.** Node 22.14 instalado (o gerador do Nest 12 falha nele) e `corepack`
  que não roda o pnpm 12. Resolvido sem instalar nada no sistema: o pnpm baixa o Node 24 para o
  projeto (`devEngines.runtime`). O pnpm em si veio por `npm install -g`.
- **Geradores que escrevem mais do que o pedido.** O `prisma init` criou pastas de instruções
  para agentes e um `.env`; o esqueleto do Nest trouxe um `AGENTS.md` que mandava ligar telemetria
  externa. Nada disso foi seguido nem commitado.
- **A tag `latest` do `prisma` aponta para um release candidate.** Fixado em 7.10.1.
- **`shadcn init` não reconhece o Tailwind 4 do Next 16.** Componentes escritos à mão no padrão.
- **A sessão caiu no meio do commit da História 1**, sem `ESTADO.md` (o commit não chegou a ser
  gravado; nada se perdeu porque estava tudo preparado no índice).
- **Pedidos de autorização** em comandos com `rm -rf` e em comandos longos fora da pasta do
  projeto pararam o fluxo duas vezes.

## O que a revisão por subagente pegou (e eu não)

- Corrida na rotação do token: marca de uso e emissão em comandos separados deixavam um token
  vivo depois da revogação. Corrigido com transação e, depois, com trava por conta.
- Prazos de 15 minutos e 7 dias sem teste.
- Repetição de requisição com corpo já consumido no cliente do front.
- Senha provisória ficando no cache de mutações do front depois de fechado o aviso.
- Troca de senha sem limite de tentativas e com a sessão nova aberta fora da transação.

## Riscos aceitos e pendências para as próximas features

- Token de acesso já emitido vale até 15 minutos depois de logout, troca ou redefinição de
  senha. Com as rotas de aluno da 002 e da 003, um aluno com a senha redefinida pelo professor
  ainda acessa por até 15 minutos com o token antigo.
- **Para a 005 (deploy)**: `trust proxy` está em `loopback` e a API escuta só em `127.0.0.1`
  (não serve para containers separados); o Swagger fica público; o `validarEnv` aceita o segredo
  de exemplo; as actions da CI estão por tag, não por SHA; não há limpeza das linhas antigas de
  `refresh_tokens`.
- A migration não tem `CHECK` de e-mail normalizado: a normalização é só da aplicação.
- Capturas: cada tela foi conferida em duas das quatro combinações (390px e 1280px, claro e
  escuro), não nas quatro. A ação "Redefinir senha" não foi exercitada à mão na tela (coberta
  por e2e).
- O teste de corrida da rotação não reproduz a falha no código antigo: a garantia é estrutural.
- A CI ainda não rodou: só roda com push, que espera o sim do dono. O `pnpm/action-setup@v4` com
  pnpm 12 é a parte menos certa do workflow.
- "Teste primeiro": na História 1 os testes foram escritos antes, mas rodaram junto com o
  código; nas Histórias 2 e 3 foram vistos falhar antes.

## O que mudaria no método

- **Emendar o `stack.md`**: trocar Jest por Vitest e ESLint por oxlint na API, e registrar que o
  Node do projeto vem pelo pnpm. Senão a 002 repete a exceção.
- Conferir o esqueleto oficial da versão atual **antes** de fechar o plan, não na implementação:
  a decisão D-15 teria entrado na entrevista.
- Gravar o `ESTADO.md` ao fim de cada história, não só ao parar: a queda da sessão não avisa.
- Havia um pacote novo do próprio Nest para autenticação (`@nestjs/authentication`, com rotação
  e revogação de família prontas). Segui o plano aprovado (guard próprio com `@nestjs/jwt`), que
  serve ao objetivo de aprender; vale reavaliar se a manutenção pesar.
