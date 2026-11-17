# Estado: 001-contas-acesso

**Gravado em**: 2026-11-17 | **Motivo da parada**: AGUARDANDO DONO (decisão que o plan não cobre)

## Onde parou

- Spec, plan e tasks aprovados e commitados; análise em 2 rodadas: PRONTO PARA IMPLEMENTAR
  (commits `fca1a1b`, `fe2e60a`, `8c77cdd`).
- Unidade em curso: Setup e Fundação (T001 a T011). Base do diff da revisão: `8c77cdd`.
- Nenhuma tarefa marcada. Nada de código commitado.

## No disco, sem commit

- Raiz: `package.json` (pnpm 12.21.0; Node 24.22.3 como runtime do projeto em
  `devEngines.runtime`, baixado pelo pnpm), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.nvmrc`,
  `.prettierrc.json`, `.prettierignore`, `.env.example`, `docker-compose.yml`,
  `scripts/postgres-init.sql`.
- `apps/api`: esqueleto cru do `@nestjs/cli` 12.0.13, sem dependências instaladas. **Depende da
  decisão abaixo; pode ser regerado.**
- `apps/web`: esqueleto cru do `create-next-app` 16.4.6, sem dependências instaladas.
- Container `fininho-treino-db-1` no ar (Postgres 17, `127.0.0.1:5450`), com os bancos
  `fininho_treino` e `fininho_treino_test`.

## Decisão pendente do dono

O NestJS 12 é só ESM e o esqueleto oficial dele vem com **Vitest e oxlint**, não com Jest e
ESLint. O `constitution/stack.md` e o plan dizem Jest (e ESLint). Opções:

- A. NestJS 12 com Vitest e oxlint (padrão do framework); exceção ao `stack.md` registrada.
- B. NestJS 12 com Jest forçado em ESM; contra o padrão do framework, risco de configuração frágil.
- C. NestJS 11 (`11.2.10`, linha `legacy`) com Jest e ESLint, como a maior parte do mercado roda
  hoje; desvia de "estável atual".

## Fatos conferidos nesta sessão

- Node do sistema: 22.14 (o `@nestjs/cli` 12 falha nele). Resolvido sem instalar nada no
  sistema: `pnpm runtime set node 24`; os scripts do pnpm rodam no 24.22.3.
- `corepack enable` exige administrador e o corepack 0.31 não roda o pnpm 12. O pnpm foi
  instalado com `npm install -g pnpm@12.21.0` (pasta de usuário `AppData\Roaming\npm`, que não
  está no PATH desta sessão: prefixar o PATH ou ajustar o `scripts/gate.sh`).
- `prisma` `latest` é release candidate (8.0.0-rc.34); usar 7.10.1, que aceita Node `^22.12` e
  `>=24`.
- Os esqueletos trazem `AGENTS.md`. O do Nest manda ligar telemetria no serviço NestJS Observe:
  não seguir; remover o arquivo ou cortar esse trecho antes do commit.

## Próximo passo

Com a resposta do dono: ajustar ou regerar `apps/api`, instalar dependências, seguir T002 a T011,
fechar a unidade (gate, revisão de qualidade, commit) e partir para a História 1.
