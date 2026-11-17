# Workflow do Projeto: fininho-treino

## Perfil de rigor

**Perfil:** Padrão

- Teste automatizado obrigatório para regra de negócio, dados, migration e
  autorização/segurança. Telas, textos e conversa: validação manual.

Requisito sem marca é tratado como regra (testável). Dispensa de teste é explícita na spec
(`[sem teste: motivo]` no FR) e aprovada no portão da spec.

## Definition of Done

- Todo FR que é regra (sem marca `[sem teste]`) tem pelo menos um teste automatizado cobrindo o
  cenário principal antes de a feature ser considerada concluída.
- Toda rota nova tem teste e2e de autorização: sem token (401), papel errado (403) e dado de
  outro dono (negado), além do caminho feliz. É a prova do princípio I.
- Bug de regra ganha teste de regressão antes da correção.
- Nenhuma feature é fechada com testes conhecidos quebrados ou pulados sem justificativa
  registrada.
- Nunca rodar teste contra banco de produção.
- Tela nova: captura no navegador embutido (390px e 1280px, claro e escuro) conferida contra o
  `~/.claude/DESIGN.base.md`.

## Testes em camadas

| Quando | O que roda | Onde |
|---|---|---|
| Durante a tarefa | Só os testes do módulo tocado (`pnpm --filter api test -- <caminho>`) | Máquina local, segundos |
| Fim do turno e fim da história | Gate rápido: `scripts/gate.sh` (lint, tipos, testes de unidade) | Máquina local, alvo abaixo de 2 min |
| PR | Suíte completa, inclusive e2e (`lento`) | CI |
| Antes do deploy | Fumaça da API e do front no ambiente | Depois do deploy, manual |

- **Marcador `lento` (Jest)**: arquivos `*.e2e-spec.ts` (banco de teste em container, migration
  de ponta a ponta). Ficam fora do script `test` e rodam em `test:e2e`, na CI.
- Um teste por cenário de regra da spec; caso extra só onde há risco declarado (autenticação,
  posse do dado, migration).
- Sem teste de configuração (versão de imagem, YAML da CI, lista de variáveis).
- Gate rápido passou de 2 min: medir (`jest --verbose` com tempos) antes de mexer.

## Gate rápido (hook do trilho)

- Script: `scripts/gate.sh`.
- Hook: `.claude/settings.json` do projeto com o `Stop` e o `PreToolUse` do trilho. Em branch de
  feature (`NNN-slug`), a sessão não encerra o turno com o gate vermelho; na 2ª falha seguida
  pede o ataque à premissa; na 3ª libera como BLOQUEADO. Cada execução vai para
  `.git/trilho/gates-NNN.jsonl` (fora do repositório).

## Segurança e Dados Sensíveis

- Segredos (JWT, token de leitor do fininho-watch, senha do banco) nunca são commitados: só
  variável de ambiente, com o nome documentado em `.env.example`.
- Dado de saúde: só dados fictícios no repositório (princípio II). Produção tem só a conta do
  dono e contas demo fictícias; aluno real exige feature própria com consentimento (LGPD).
- Senha com argon2; JWT de acesso curto + refresh; guard global com `@Public()` como exceção;
  `@Roles()` para papel; posse checada no service (contrato em `specs/_sistema/autenticacao.md`).
- Log sem senha, token, hash ou dado de treino em texto.

## Branch, Commit e Pull Request

- Uma branch por feature, nomeada `NNN-slug` (o mesmo nome da pasta em `specs/`). Nunca commit
  direto em `main`.
- Conventional Commits em português: `tipo(escopo): descrição sem ponto final`
  (`feat(fichas): ...`), sem linha de atribuição de IA.
- Identificadores de código em inglês; termos de domínio em português onde o mercado não tem
  termo consagrado (`ficha`, `sessao`, `serie`).
- Um commit por história de usuário, com o porquê, o que mudou e como foi provado (o comando do
  gate e o resultado). Push e PR só com autorização do dono; merge sempre pelo dono.
- **Uma feature em implementação por vez** neste repositório; specs até duas à frente. Merge na
  `main` antes de começar a implementação seguinte: nada de PRs empilhadas.
- Relatórios de análise e revisão ficam versionados em `specs/NNN-slug/`
  (`ANALISE_CONSISTENCIA.md`, `revisao/USn.md`).

## Gates antes de abrir PR

- `pnpm -r lint` sem erro e formatação (Prettier) sem mudança pendente
- `pnpm -r typecheck` sem erro
- `pnpm -r test` e `pnpm --filter api test:e2e` passando
- `pnpm -r build` sem erro
- Sem `console.log` de depuração
- Migration nova revisada (Prisma não gera `down`: o plano de desfazer vai na PR); variável de
  ambiente nova documentada em `.env.example`

## Merge e deploy

- Merge na `main` dispara deploy: sim, automático pelo Dokploy, **a partir da feature 005**.
  Antes dela, não há deploy.
- Checklist de merge (vai na descrição da PR, cada item marcado ou justificado):
  - [ ] Gates de PR verdes e CI verde
  - [ ] Migration nova: plano de desfazer escrito e backup recente do banco confirmado pelo dono
        antes do merge
  - [ ] Variável de ambiente nova: criada no Dokploy, não só no `.env.example`
  - [ ] Como desfazer: reverter o merge (e a migration, pelo plano escrito)
  - [ ] Nenhum dado real em seed, fixture, teste ou print
