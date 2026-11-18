import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../config/env.js';
import { SessoesService } from './sessoes.service.js';
import { ACESSO_TTL_SEGUNDOS } from './tokens.js';

/**
 * Emissão e revogação de sessões. Fica separado do AuthModule para o UsuariosModule poder
 * derrubar sessões (redefinição de senha) sem depender do módulo que depende dele.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256', expiresIn: ACESSO_TTL_SEGUNDOS },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  providers: [SessoesService],
  exports: [SessoesService, JwtModule],
})
export class SessoesModule {}
