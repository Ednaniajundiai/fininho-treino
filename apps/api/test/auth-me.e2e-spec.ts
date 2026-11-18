import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { criarProfessor, entrar, limparBanco, PAULA, subirApp } from './apoio.js';

// lento: usa o banco de teste.
describe('guard global e GET /api/auth/me', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await subirApp();
  });
  beforeEach(async () => {
    await limparBanco(app);
    await criarProfessor(app);
  });
  afterAll(() => app.close());

  it('a verificação de saúde responde sem autenticação (FR-010)', async () => {
    const resposta = await request(app.getHttpServer()).get('/api/health');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });

  it('sem token responde 401 "não autenticado" (FR-010)', async () => {
    const resposta = await request(app.getHttpServer()).get('/api/auth/me');
    expect(resposta.status).toBe(401);
    expect(resposta.body.message).toBe('Não autenticado.');
  });

  it('com token inválido responde 401 (FR-010)', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer isto.nao.e-um-token');
    expect(resposta.status).toBe(401);
  });

  it('com token válido devolve a própria conta (FR-011)', async () => {
    const { accessToken } = await entrar(app, PAULA);

    const resposta = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      id: expect.any(String),
      nome: 'Paula Prado',
      email: 'paula@exemplo.test',
      papel: 'PROFESSOR',
      senhaProvisoria: false,
    });
  });
});
