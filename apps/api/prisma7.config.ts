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
    // Exercícios fictícios só para desenvolvimento (prisma/seed.ts). O Node roda o TypeScript
    // direto (só tipos apagáveis); a flag é para o Node 22, no 24 ela é o padrão.
    seed: 'node --experimental-strip-types prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
