import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ContaDto, paraContaDto } from '../usuarios/dto/conta.dto.js';
import { AuthService } from './auth.service.js';
import { COOKIE_DE_RENOVACAO, OPCOES_AO_GRAVAR, OPCOES_DO_COOKIE } from './cookie.js';
import { Public, UsuarioAtual, type UsuarioAutenticado } from './decorators.js';
import { LoginDto } from './dto/login.dto.js';
import { SessaoDto } from './dto/sessao.dto.js';
import { LimiteDeLoginGuard } from './guards/limite-de-login.guard.js';
import { type Sessao, SessoesService } from './sessoes.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessoes: SessoesService,
  ) {}

  @Public()
  @UseGuards(LimiteDeLoginGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Entrar com e-mail e senha' })
  @ApiOkResponse({ type: SessaoDto })
  @ApiUnauthorizedResponse({
    description: 'E-mail ou senha inválidos (mesma resposta nos dois casos).',
  })
  @ApiTooManyRequestsResponse({ description: 'Mais de 5 tentativas em um minuto da mesma origem.' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<SessaoDto> {
    return this.responderComSessao(await this.auth.entrar(dto.email, dto.senha), resposta);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth(COOKIE_DE_RENOVACAO)
  @ApiOperation({ summary: 'Renovar a sessão (gira o token de renovação do cookie)' })
  @ApiOkResponse({ type: SessaoDto })
  @ApiUnauthorizedResponse({ description: 'Sem cookie, ou token inválido, vencido ou já usado.' })
  async refresh(
    @Req() requisicao: Request,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<SessaoDto> {
    const valor = lerCookie(requisicao);
    if (!valor) throw new UnauthorizedException('Não autenticado.');
    try {
      return this.responderComSessao(await this.sessoes.renovar(valor), resposta);
    } catch (erro) {
      // O cookie não serve mais: tira do navegador para ele não reapresentar um token morto.
      resposta.clearCookie(COOKIE_DE_RENOVACAO, OPCOES_DO_COOKIE);
      throw erro;
    }
  }

  // Pública de propósito: sair vale pelo cookie, mesmo com o token de acesso já vencido.
  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth(COOKIE_DE_RENOVACAO)
  @ApiOperation({ summary: 'Sair: revoga a sessão deste aparelho' })
  @ApiNoContentResponse()
  async logout(
    @Req() requisicao: Request,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<void> {
    const valor = lerCookie(requisicao);
    if (valor) await this.sessoes.encerrar(valor);
    resposta.clearCookie(COOKIE_DE_RENOVACAO, OPCOES_DO_COOKIE);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'A conta de quem está autenticado' })
  @ApiOkResponse({ type: ContaDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado.' })
  async me(@UsuarioAtual() usuario: UsuarioAutenticado): Promise<ContaDto> {
    return paraContaDto(await this.auth.minhaConta(usuario.id));
  }

  private responderComSessao(sessao: Sessao, resposta: Response): SessaoDto {
    resposta.cookie(COOKIE_DE_RENOVACAO, sessao.refreshToken, OPCOES_AO_GRAVAR);
    return { accessToken: sessao.accessToken, usuario: paraContaDto(sessao.usuario) };
  }
}

function lerCookie(requisicao: Request): string | undefined {
  const valor: unknown = (requisicao.cookies as Record<string, unknown> | undefined)?.[
    COOKIE_DE_RENOVACAO
  ];
  return typeof valor === 'string' && valor.length > 0 ? valor : undefined;
}
