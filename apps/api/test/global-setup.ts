import { execSync } from 'node:child_process';
import pg from 'pg';
import { URL_DO_BANCO_DE_TESTE } from './setup-env.js';

/**
 * Antes da suíte e2e: zera o banco de teste e aplica todas as migrations do zero.
 * É a prova de que as migrations sobem num banco vazio (marcador "lento").
 */
export default async function globalSetup(): Promise<void> {
  const cliente = new pg.Client({ connectionString: URL_DO_BANCO_DE_TESTE });
  await cliente.connect();
  await cliente.query('DROP SCHEMA IF EXISTS public CASCADE');
  await cliente.query('CREATE SCHEMA public');
  await cliente.end();

  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: URL_DO_BANCO_DE_TESTE },
    stdio: 'pipe',
  });
}
