import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Em desenvolvimento, as variáveis vêm do .env da raiz do monorepo (o Next só lê o da pasta
// do app). Variável já definida no ambiente tem precedência.
const envDaRaiz = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envDaRaiz)) process.loadEnvFile(envDaRaiz);

// A API fica atrás do Next, na mesma origem (/api): o cookie de renovação é SameSite=Strict e
// não há CORS. Em desenvolvimento a API roda em 127.0.0.1:3001 (API_INTERNAL_URL no .env).
const apiInterna = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001';

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  rewrites() {
    return [{ source: '/api/:caminho*', destination: `${apiInterna}/api/:caminho*` }];
  },
};

export default nextConfig;
