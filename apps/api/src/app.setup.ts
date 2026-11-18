import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

/**
 * Configuração HTTP compartilhada entre a subida real (main.ts), os testes e2e e a geração do
 * OpenAPI, para que os três vejam a mesma API.
 */
export function configurarApp(app: NestExpressApplication): void {
  app.setGlobalPrefix('api');
  // O front chega pelo proxy do Next, na mesma máquina: confia no X-Forwarded-For só de
  // loopback, para o limite de tentativas de login enxergar a origem real. Revisar na 005.
  app.set('trust proxy', 'loopback');
  app.use(cookieParser());
  // whitelist: campo fora do DTO é recusado com 400, em vez de ignorado em silêncio.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
}
