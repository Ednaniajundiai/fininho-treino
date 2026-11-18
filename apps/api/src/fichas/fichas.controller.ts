import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles, UsuarioAtual, type UsuarioAutenticado } from '../auth/decorators.js';
import {
  CriarFichaDto,
  FichaDto,
  FichaResumoDto,
  paraFichaDto,
  paraFichaResumoDto,
} from './dto/ficha.dto.js';
import { FichasService } from './fichas.service.js';

/**
 * Fichas de treino do professor (contrato fichas/C-01). Só professor chega aqui (@Roles); a
 * posse da ficha e do aluno é checada no service em toda operação.
 */
@ApiTags('fichas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Não autenticado.' })
@ApiForbiddenResponse({ description: 'Sem permissão: só professor.' })
@Roles('PROFESSOR')
@Controller()
export class FichasController {
  constructor(private readonly fichas: FichasService) {}

  @Post('alunos/:alunoId/fichas')
  @ApiOperation({ summary: 'Criar ficha para um aluno do professor logado (rascunho ou já ativa)' })
  @ApiCreatedResponse({ type: FichaDto })
  @ApiBadRequestResponse({
    description:
      'Ficha inválida (faixa, séries, tetos, dia sem item ao ativar) ou exercício indisponível.',
  })
  @ApiNotFoundResponse({ description: 'Aluno não encontrado (inexistente ou de outro professor).' })
  async criar(
    @UsuarioAtual() professor: UsuarioAutenticado,
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
    @Body() dto: CriarFichaDto,
  ): Promise<FichaDto> {
    return paraFichaDto(await this.fichas.criar(professor.id, alunoId, dto));
  }

  @Get('alunos/:alunoId/fichas')
  @ApiOperation({ summary: 'Listar as fichas de um aluno do professor logado' })
  @ApiOkResponse({ type: [FichaResumoDto] })
  @ApiNotFoundResponse({ description: 'Aluno não encontrado (inexistente ou de outro professor).' })
  async listar(
    @UsuarioAtual() professor: UsuarioAutenticado,
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
  ): Promise<FichaResumoDto[]> {
    return (await this.fichas.listarPorAluno(professor.id, alunoId)).map(paraFichaResumoDto);
  }

  @Get('fichas/:id')
  @ApiOperation({ summary: 'Ler uma ficha completa do professor logado' })
  @ApiOkResponse({ type: FichaDto })
  @ApiNotFoundResponse({ description: 'Ficha não encontrada (inexistente ou de outro professor).' })
  async obter(
    @UsuarioAtual() professor: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FichaDto> {
    return paraFichaDto(await this.fichas.obter(professor.id, id));
  }

  @Post('fichas/:id/ativar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ativar a ficha; a ativa anterior do aluno é arquivada' })
  @ApiOkResponse({ type: FichaDto })
  @ApiBadRequestResponse({ description: 'Ficha sem dia, ou com dia sem item.' })
  @ApiNotFoundResponse({ description: 'Ficha não encontrada (inexistente ou de outro professor).' })
  async ativar(
    @UsuarioAtual() professor: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FichaDto> {
    return paraFichaDto(await this.fichas.ativar(professor.id, id));
  }
}
