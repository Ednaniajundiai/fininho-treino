import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMITE_SENHA_PROVISORIA, type UsuarioAutenticado } from '../decorators.js';

/**
 * Guard global (contrato autenticacao/C-02): conta com senha provisória só alcança as rotas
 * marcadas com @PermiteSenhaProvisoria(); nas demais recebe 403 até trocar a senha. Roda depois
 * do JwtAuthGuard e antes do RolesGuard.
 */
@Injectable()
export class SenhaProvisoriaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const { usuario } = contexto.switchToHttp().getRequest<{ usuario?: UsuarioAutenticado }>();
    // Rota pública chega sem usuário: nada a conferir aqui.
    if (!usuario?.mustChangePassword) return true;

    const liberada = this.reflector.getAllAndOverride<boolean>(PERMITE_SENHA_PROVISORIA, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!liberada) throw new ForbiddenException('Troque a senha provisória para continuar.');
    return true;
  }
}
