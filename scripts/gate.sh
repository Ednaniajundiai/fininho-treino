#!/usr/bin/env bash
# Gate rápido do fininho-treino (trilho). Roda no fim de cada turno em branch de
# feature (hook Stop) e ao fechar cada história. Alvo: menos de 2 minutos.
# Testes e2e (*.e2e-spec.ts, marcador "lento") ficam fora: rodam na CI.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# O pnpm instalado com "npm install -g" fica na pasta global do npm, que nem sempre está no
# PATH do shell que roda o hook. A consulta ao npm roda fora do projeto: dentro dele o npm
# recusa o Node declarado em devEngines (quem baixa esse Node é o pnpm).
if ! command -v pnpm >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  prefixo="$(cd "${TMPDIR:-/tmp}" && npm config get prefix 2>/dev/null || true)"
  if [ -n "$prefixo" ]; then
    if command -v cygpath >/dev/null 2>&1; then prefixo="$(cygpath -u "$prefixo")"; fi
    PATH="$PATH:$prefixo:$prefixo/bin"
    export PATH
  fi
fi

if [ ! -f package.json ]; then
  echo "gate: monorepo ainda não criado (feature 001); nada a verificar."
  exit 0
fi

pnpm -r --if-present lint
pnpm -r --if-present typecheck
pnpm -r --if-present test
