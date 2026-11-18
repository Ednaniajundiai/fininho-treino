import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { LimiteDeLoginGuard } from './guards/limite-de-login.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { SessoesModule } from './sessoes.module.js';

@Module({
  imports: [
    SessoesModule,
    // O limite só vale onde o LimiteDeLoginGuard é aplicado (a rota de login).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LimiteDeLoginGuard,
    // Guards globais, nesta ordem: primeiro autentica, depois confere o papel.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
