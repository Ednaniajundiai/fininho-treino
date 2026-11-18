/**
 * Gera apps/api/openapi.json, a fonte dos tipos do front (princípio V). Rodar com
 * `pnpm gen:api` na raiz depois de mudar rota ou DTO; a CI falha se o arquivo commitado
 * estiver diferente do gerado.
 *
 * Não abre porta nem conecta no banco; as variáveis abaixo só satisfazem a validação da subida.
 */
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

process.env['DATABASE_URL'] ??= 'postgresql://sem-uso@127.0.0.1:1/sem-uso';
process.env['JWT_ACCESS_SECRET'] ??= 'valor-sem-uso-apenas-para-gerar-o-openapi';

const { AppModule } = await import('./app.module.js');
const { configurarApp } = await import('./app.setup.js');
const { montarOpenApi } = await import('./openapi.setup.js');

const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error'] });
configurarApp(app);
const destino = new URL('../openapi.json', import.meta.url);
writeFileSync(destino, `${JSON.stringify(montarOpenApi(app), null, 2)}\n`);
await app.close();
console.log('openapi.json atualizado');
