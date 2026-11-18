import { Module } from '@nestjs/common';
import { SessoesModule } from '../auth/sessoes.module.js';
import { AlunosController } from './alunos.controller.js';
import { UsuariosService } from './usuarios.service.js';

@Module({
  imports: [SessoesModule],
  controllers: [AlunosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
