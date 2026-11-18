import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../decorators.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

class Rotas {
  protegida() {}

  @Public()
  publica() {}
}

const jwt = new JwtService({ secret: 'segredo-de-teste-com-mais-de-32-caracteres' });
const guard = new JwtAuthGuard(jwt, new Reflector());
const payload = { sub: 'id-da-paula', role: 'PROFESSOR', mcp: false };

function contexto(rota: keyof Rotas, authorization?: string) {
  const requisicao: { headers: Record<string, string>; usuario?: unknown } = {
    headers: authorization ? { authorization } : {},
  };
  const ctx = {
    getHandler: () => Rotas.prototype[rota],
    getClass: () => Rotas,
    switchToHttp: () => ({ getRequest: () => requisicao }),
  } as unknown as ExecutionContext;
  return { ctx, requisicao };
}

describe('JwtAuthGuard', () => {
  it('nega rota protegida sem token', async () => {
    await expect(guard.canActivate(contexto('protegida').ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('nega token com assinatura inválida', async () => {
    const deOutroSegredo = new JwtService({ secret: 'outro-segredo-qualquer-bem-comprido-123' });
    const token = await deOutroSegredo.signAsync(payload);
    await expect(guard.canActivate(contexto('protegida', `Bearer ${token}`).ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('nega token vencido', async () => {
    const token = await jwt.signAsync({ ...payload, exp: Math.floor(Date.now() / 1000) - 60 });
    await expect(guard.canActivate(contexto('protegida', `Bearer ${token}`).ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('nega esquema que não é Bearer', async () => {
    const token = await jwt.signAsync(payload);
    await expect(guard.canActivate(contexto('protegida', `Basic ${token}`).ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('libera token válido e põe o usuário na requisição', async () => {
    const token = await jwt.signAsync(payload, { expiresIn: 60 });
    const { ctx, requisicao } = contexto('protegida', `Bearer ${token}`);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(requisicao.usuario).toEqual({
      id: 'id-da-paula',
      role: 'PROFESSOR',
      mustChangePassword: false,
    });
  });

  it('libera rota marcada com @Public() sem token', async () => {
    await expect(guard.canActivate(contexto('publica').ctx)).resolves.toBe(true);
  });
});
