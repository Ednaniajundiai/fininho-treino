import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

// Em desenvolvimento, as variáveis vêm do .env da raiz do monorepo. Variável já definida
// no ambiente (CI, testes e2e) tem precedência: loadEnvFile não sobrescreve.
const envDaRaiz = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envDaRaiz)) process.loadEnvFile(envDaRaiz);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
