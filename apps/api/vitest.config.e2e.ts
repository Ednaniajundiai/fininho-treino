import { defineConfig } from 'vitest/config';

// Testes e2e ("lento"): precisam do Postgres de teste (docker compose up -d). Rodam com
// pnpm test:e2e, fora do gate rápido, e sempre na CI.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // Um banco só: os arquivos rodam em sequência e cada teste começa com as tabelas vazias.
    fileParallelism: false,
    // A primeira importação do app e o argon2 são lentos em máquina fria.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
