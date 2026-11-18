import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles, UsuarioAtual, type UsuarioAutenticado } from '../auth/decorators.js';
import { CriarExercicioDto, ExercicioDto, paraExercicioDto } from './dto/exercicio.dto.js';
import { ExerciciosService } from './exercicios.service.js';

/** Catálogo de exercícios do professor (contrato fichas/C-02). Posse checada no service. */
@ApiTags('exercicios')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Não autenticado.' })
@ApiForbiddenResponse({ description: 'Sem permissão: só professor.' })
@Roles('PROFESSOR')
@Controller('exercicios')
export class ExerciciosController {
  constructor(private readonly exercicios: ExerciciosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar o catálogo do professor logado, com os desativados' })
  @ApiOkResponse({ type: [ExercicioDto] })
  async listar(@UsuarioAtual() professor: UsuarioAutenticado): Promise<ExercicioDto[]> {
    return (await this.exercicios.listar(professor.id)).map(paraExercicioDto);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastrar exercício no catálogo do professor logado' })
  @ApiCreatedResponse({ type: ExercicioDto })
  @ApiConflictResponse({ description: 'Nome já existe no catálogo (sem diferença de maiúsculas).' })
  async criar(
    @UsuarioAtual() professor: UsuarioAutenticado,
    @Body() dto: CriarExercicioDto,
  ): Promise<ExercicioDto> {
    return paraExercicioDto(await this.exercicios.criar(professor.id, dto));
  }
}
