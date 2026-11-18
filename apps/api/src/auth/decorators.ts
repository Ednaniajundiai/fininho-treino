import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '../generated/prisma/client.js';

/** Quem está autenticado na requisição, lido do token de acesso pelo JwtAuthGuard. */
export type UsuarioAutenticado = {
  id: string;
  role: Role;
  mustChangePassword: boolean;
};

export const ROTA_PUBLICA = 'rotaPublica';
/** Toda rota exige autenticação; esta marca é a exceção (contrato autenticacao/C-01). */
export const Public = () => SetMetadata(ROTA_PUBLICA, true);

export const PAPEIS_PERMITIDOS = 'papeisPermitidos';
/** Restringe a rota aos papéis listados; os demais recebem 403. */
export const Roles = (...papeis: Role[]) => SetMetadata(PAPEIS_PERMITIDOS, papeis);

export const PERMITE_SENHA_PROVISORIA = 'permiteSenhaProvisoria';
/**
 * Conta com senha provisória recebe 403 em toda rota, salvo as marcadas com este decorator:
 * trocar a senha e consultar a própria conta (contrato autenticacao/C-02). Renovar a sessão e
 * sair também passam, por serem @Public().
 */
export const PermiteSenhaProvisoria = () => SetMetadata(PERMITE_SENHA_PROVISORIA, true);

export const UsuarioAtual = createParamDecorator(
  (_dado: unknown, contexto: ExecutionContext): UsuarioAutenticado =>
    contexto.switchToHttp().getRequest<{ usuario: UsuarioAutenticado }>().usuario,
);
