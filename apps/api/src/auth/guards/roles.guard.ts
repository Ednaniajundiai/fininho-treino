import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../../generated/prisma/client.js';
import { PAPEIS_PERMITIDOS, type UsuarioAutenticado } from '../decorators.js';

/** Guard global: rota com @Roles() recusa quem tem outro papel com 403. Roda depois do JwtAuthGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const papeis = this.reflector.getAllAndOverride<Role[] | undefined>(PAPEIS_PERMITIDOS, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!papeis || papeis.length === 0) return true;

    const { usuario } = contexto.switchToHttp().getRequest<{ usuario?: UsuarioAutenticado }>();
    if (!usuario || !papeis.includes(usuario.role)) {
      throw new ForbiddenException('Sem permissão.');
    }
    return true;
  }
}
