#!/usr/bin/env bash
# Gate rápido do fininho-treino (trilho). Roda no fim de cada turno em branch de
# feature (hook Stop) e ao fechar cada história. Alvo: menos de 2 minutos.
# Testes e2e (*.e2e-spec.ts, marcador "lento") ficam fora: rodam na CI.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [ ! -f package.json ]; then
  echo "gate: monorepo ainda não criado (feature 001); nada a verificar."
  exit 0
fi

pnpm -r --if-present lint
pnpm -r --if-present typecheck
pnpm -r --if-present test
