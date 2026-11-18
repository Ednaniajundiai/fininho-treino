import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermiteSenhaProvisoria, type UsuarioAutenticado } from '../decorators.js';
import { SenhaProvisoriaGuard } from './senha-provisoria.guard.js';

class Rotas {
  comum() {}

  @PermiteSenhaProvisoria()
  liberada() {}
}

const guard = new SenhaProvisoriaGuard(new Reflector());

function contexto(rota: keyof Rotas, usuario?: UsuarioAutenticado): ExecutionContext {
  return {
    getHandler: () => Rotas.prototype[rota],
    getClass: () => Rotas,
    switchToHttp: () => ({ getRequest: () => ({ usuario }) }),
  } as unknown as ExecutionContext;
}

const comProvisoria: UsuarioAutenticado = { id: 'ari', role: 'ALUNO', mustChangePassword: true };
const comDefinitiva: UsuarioAutenticado = { ...comProvisoria, mustChangePassword: false };

describe('SenhaProvisoriaGuard', () => {
  it('nega rota comum a quem está com senha provisória', () => {
    expect(() => guard.canActivate(contexto('comum', comProvisoria))).toThrow(ForbiddenException);
  });

  it('libera a quem está com senha provisória a rota marcada com @PermiteSenhaProvisoria()', () => {
    expect(guard.canActivate(contexto('liberada', comProvisoria))).toBe(true);
  });

  it('libera rota comum a quem tem senha definitiva', () => {
    expect(guard.canActivate(contexto('comum', comDefinitiva))).toBe(true);
  });

  it('não interfere em rota pública, que chega sem usuário', () => {
    expect(guard.canActivate(contexto('comum'))).toBe(true);
  });
});
