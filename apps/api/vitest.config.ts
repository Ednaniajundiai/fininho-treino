import { defineConfig } from 'vitest/config';

// Testes de unidade: rápidos, sem banco. É o que o gate rápido roda (pnpm test).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
