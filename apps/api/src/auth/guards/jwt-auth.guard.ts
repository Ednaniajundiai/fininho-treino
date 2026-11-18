import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ROTA_PUBLICA, type UsuarioAutenticado } from '../decorators.js';
import type { PayloadDoAcesso } from '../tokens.js';

/**
 * Guard global: toda rota exige um token de acesso válido em "Authorization: Bearer",
 * salvo as marcadas com @Public().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean>(ROTA_PUBLICA, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (publica) return true;

    const requisicao = contexto
      .switchToHttp()
      .getRequest<Request & { usuario?: UsuarioAutenticado }>();
    const [esquema, token] = requisicao.headers.authorization?.split(' ') ?? [];
    if (esquema !== 'Bearer' || !token) throw new UnauthorizedException('Não autenticado.');

    try {
      const payload = await this.jwt.verifyAsync<PayloadDoAcesso>(token);
      requisicao.usuario = {
        id: payload.sub,
        role: payload.role,
        // Falha fechada: token sem a marca é tratado como senha provisória.
        mustChangePassword: payload.mcp !== false,
      };
    } catch {
      // Assinatura inválida ou token vencido: a resposta não diz qual dos dois.
      throw new UnauthorizedException('Não autenticado.');
    }
    return true;
  }
}
