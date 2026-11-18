import { Module } from '@nestjs/common';
import { ExerciciosModule } from '../exercicios/exercicios.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { FichasController } from './fichas.controller.js';
import { FichasService } from './fichas.service.js';

@Module({
  imports: [UsuariosModule, ExerciciosModule],
  controllers: [FichasController],
  providers: [FichasService],
})
export class FichasModule {}
