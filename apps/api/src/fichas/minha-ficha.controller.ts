import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles, UsuarioAtual, type UsuarioAutenticado } from '../auth/decorators.js';
import { MinhaFichaDto, paraFichaDto } from './dto/ficha.dto.js';
import { FichasService } from './fichas.service.js';

/**
 * A ficha do aluno logado (FR-008). Só aluno chega aqui (@Roles); conta com senha provisória
 * leva 403 do guard global. Não há id na rota: o aluno vem do token, então nunca vê a de outro.
 */
@ApiTags('fichas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Não autenticado.' })
@ApiForbiddenResponse({ description: 'Sem permissão: só aluno, já com a senha trocada.' })
@Roles('ALUNO')
@Controller('minha-ficha')
export class MinhaFichaController {
  constructor(private readonly fichas: FichasService) {}

  @Get()
  @ApiOperation({ summary: 'Ler a ficha ativa do aluno logado (nunca rascunho nem arquivada)' })
  @ApiOkResponse({ type: MinhaFichaDto })
  async obter(@UsuarioAtual() aluno: UsuarioAutenticado): Promise<MinhaFichaDto> {
    const ficha = await this.fichas.ativaDoAluno(aluno.id);
    return { ficha: ficha ? paraFichaDto(ficha) : null };
  }
}
