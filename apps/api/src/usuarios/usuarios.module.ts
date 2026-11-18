import { Module } from '@nestjs/common';
import { SessoesModule } from '../auth/sessoes.module.js';
import { UsuariosService } from './usuarios.service.js';

@Module({
  imports: [SessoesModule],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
