import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
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
import { AlunoComSenhaProvisoriaDto, CriarAlunoDto } from './dto/aluno.dto.js';
import { ContaDto, paraContaDto } from './dto/conta.dto.js';
import { UsuariosService } from './usuarios.service.js';

/**
 * Contas de aluno (contrato autenticacao/C-02). Só professor chega aqui (@Roles); a posse, ou
 * seja, "este aluno é deste professor", é checada no service em toda operação.
 */
@ApiTags('alunos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Não autenticado.' })
@ApiForbiddenResponse({ description: 'Sem permissão: só professor.' })
@Roles('PROFESSOR')
@Controller('alunos')
export class AlunosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar a conta de um aluno, vinculada ao professor logado' })
  @ApiCreatedResponse({ type: AlunoComSenhaProvisoriaDto })
  @ApiConflictResponse({ description: 'E-mail já cadastrado.' })
  async criar(
    @UsuarioAtual() professor: UsuarioAutenticado,
    @Body() dto: CriarAlunoDto,
  ): Promise<AlunoComSenhaProvisoriaDto> {
    const { usuario, senhaProvisoria } = await this.usuarios.criarAluno(professor.id, dto);
    return { aluno: paraContaDto(usuario), senhaProvisoria };
  }

  @Get()
  @ApiOperation({ summary: 'Listar os alunos do professor logado' })
  @ApiOkResponse({ type: [ContaDto] })
  async listar(@UsuarioAtual() professor: UsuarioAutenticado): Promise<ContaDto[]> {
    return (await this.usuarios.listarAlunos(professor.id)).map(paraContaDto);
  }

  @Post(':id/redefinir-senha')
  @HttpCode(200)
  @ApiOperation({ summary: 'Gerar nova senha provisória para um aluno do professor logado' })
  @ApiOkResponse({ type: AlunoComSenhaProvisoriaDto })
  @ApiNotFoundResponse({ description: 'Aluno não encontrado (inexistente ou de outro professor).' })
  async redefinirSenha(
    @UsuarioAtual() professor: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AlunoComSenhaProvisoriaDto> {
    const { usuario, senhaProvisoria } = await this.usuarios.redefinirSenhaAluno(professor.id, id);
    return { aluno: paraContaDto(usuario), senhaProvisoria };
  }
}
