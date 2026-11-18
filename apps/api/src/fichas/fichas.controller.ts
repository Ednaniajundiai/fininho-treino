import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
  AtualizarFichaDto,
  CriarFichaDto,
  DuplicarFichaDto,
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
  @ApiConflictResponse({ description: 'Ficha arquivada não volta a ficar ativa (duplique).' })
  async ativar(
    @UsuarioAtual() professor: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FichaDto> {
    return paraFichaDto(await this.fichas.ativar(professor.id, id));
  }

  @Put('fichas/:id')
  @ApiOperation({
    summary: 'Salvar a ficha: nome, dias e itens substituem os atuais (o status não muda)',
  })
  @ApiOkResponse({ type: FichaDto })
  @ApiBadRequestResponse({
    description:
      'Ficha inválida (faixa, séries, tetos; ficha ativa sem dia ou dia sem item) ou exercício indisponível.',
  })
  @ApiNotFoundResponse({ description: 'Ficha não encontrada (inexistente ou de outro professor).' })
  @ApiConflictResponse({ description: 'Ficha arquivada é só leitura.' })
  async atualizar(
    @UsuarioAtual() professor: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarFichaDto,
  ): Promise<FichaDto> {
    return paraFichaDto(await this.fichas.atualizar(professor.id, id, dto));
  }

  @Post('fichas/:id/arquivar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Arquivar a ficha; se era a ativa, o aluno fica sem ficha ativa' })
  @ApiOkResponse({ type: FichaDto })
  @ApiNotFoundResponse({ description: 'Ficha não encontrada (inexistente ou de outro professor).' })
  @ApiConflictResponse({ description: 'A ficha já está arquivada.' })
  async arquivar(
    @UsuarioAtual() professor: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FichaDto> {
    return paraFichaDto(await this.fichas.arquivar(professor.id, id));
  }

  @Post('fichas/:id/duplicar')
  @ApiOperation({
    summary: 'Duplicar a ficha para um aluno do professor logado; a cópia nasce em rascunho',
  })
  @ApiCreatedResponse({ type: FichaDto })
  @ApiNotFoundResponse({
    description: 'Ficha ou aluno de destino não encontrado (inexistente ou de outro professor).',
  })
  async duplicar(
    @UsuarioAtual() professor: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicarFichaDto,
  ): Promise<FichaDto> {
    return paraFichaDto(await this.fichas.duplicar(professor.id, id, dto.alunoId));
  }
}
