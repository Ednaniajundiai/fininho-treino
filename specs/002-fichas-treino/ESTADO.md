# Estado: 002-fichas-treino

**Gravado em**: 2026-11-18 | **Branch**: `002-fichas-treino` | **Último commit**: ver `git log` (commit da História 1)
**Situação**: parada entre histórias (continua ocupando a vaga de implementação)

## Onde parou

História 1 (Setup, Fundação, API e front do professor) commitada. Próxima: revisão por subagente da
H1, depois a História 2 (T026–T033, `GET /minha-ficha` e `app/minha-ficha`).

## O que foi tentado e falhou

- Nada pendente. Duas ativações simultâneas davam 500 sem a trava `FOR UPDATE`; resolvido.

## Em aberto

- Emenda do `constitution/stack.md` (Jest e ESLint para Vitest e oxlint) é do dono.
- Erros de formato do class-validator na API saem em inglês.

## Próximo passo

1. Ler `revisao/US1.md`; corrigir bloqueantes se houver.
2. Implementar a História 2 (teste primeiro).

## Ambiente

- Postgres de dev em 127.0.0.1:5450 (`fininho-treino-db-1`, da 001); pnpm fora do PATH do bash:
  `export PATH="$PATH:/c/Users/ednan/AppData/Roaming/npm"`; e2e recriam `fininho_treino_test`.
