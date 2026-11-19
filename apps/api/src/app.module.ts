import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { validarEnv } from './config/env.js';
import { ExerciciosModule } from './exercicios/exercicios.module.js';
import { FichasModule } from './fichas/fichas.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';

@Module({
  imports: [
    // Em desenvolvimento lê o .env da raiz do monorepo (se existir), de onde quer que o
    // processo seja iniciado; variável já definida no ambiente tem precedência.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [fileURLToPath(new URL('../../../.env', import.meta.url))],
      validate: validarEnv,
    }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    ExerciciosModule,
    FichasModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
