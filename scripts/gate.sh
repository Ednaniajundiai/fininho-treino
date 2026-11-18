#!/usr/bin/env bash
# Gate rápido do fininho-treino (trilho). Roda no fim de cada turno em branch de
# feature (hook Stop) e ao fechar cada história. Alvo: menos de 2 minutos.
# Testes e2e (*.e2e-spec.ts, marcador "lento") ficam fora: rodam na CI.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# O pnpm instalado com "npm install -g" fica na pasta global do npm, que nem sempre está no
# PATH do shell que roda o hook.
if ! command -v pnpm >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  PATH="$PATH:$(npm config get prefix)"
  export PATH
fi

if [ ! -f package.json ]; then
  echo "gate: monorepo ainda não criado (feature 001); nada a verificar."
  exit 0
fi

pnpm -r --if-present lint
pnpm -r --if-present typecheck
pnpm -r --if-present test
