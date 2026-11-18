import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { criarProfessor, entrar, limparBanco, novaOrigem, PAULA, subirApp } from './apoio.js';

// lento: usa o banco de teste.
describe('POST /api/auth/login', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await subirApp();
  });
  beforeEach(async () => {
    await limparBanco(app);
    await criarProfessor(app);
  });
  afterAll(() => app.close());

  it('com e-mail e senha corretos, devolve o token de acesso e a conta (FR-005)', async () => {
    const { resposta } = await entrar(app, PAULA);

    expect(resposta.status).toBe(200);
    expect(resposta.body.accessToken).toEqual(expect.any(String));
    expect(resposta.body.usuario).toEqual({
      id: expect.any(String),
      nome: 'Paula Prado',
      email: 'paula@exemplo.test',
      papel: 'PROFESSOR',
      senhaProvisoria: false,
    });
  });

  it('aceita o e-mail com outra caixa e espaços nas pontas (FR-014)', async () => {
    const { resposta } = await entrar(app, { ...PAULA, email: '  Paula@Exemplo.TEST ' });
    expect(resposta.status).toBe(200);
  });

  it('responde igual para e-mail inexistente e para senha errada (FR-005)', async () => {
    const senhaErrada = await entrar(app, { ...PAULA, senha: 'senha-que-nao-e-a-dela' });
    const emailInexistente = await entrar(app, {
      email: 'ninguem@exemplo.test',
      senha: PAULA.senha,
    });

    expect(senhaErrada.resposta.status).toBe(401);
    expect(emailInexistente.resposta.status).toBe(401);
    expect(emailInexistente.resposta.body).toEqual(senhaErrada.resposta.body);
    expect(senhaErrada.resposta.body.message).toBe('E-mail ou senha inválidos.');
  });

  it('nunca devolve a senha nem o hash, e guarda a senha como argon2id (FR-019)', async () => {
    const { resposta } = await entrar(app, PAULA);
    const corpo = JSON.stringify(resposta.body);
    const conta = await app
      .get(PrismaService)
      .user.findUniqueOrThrow({ where: { email: PAULA.email } });

    expect(conta.passwordHash).toMatch(/^\$argon2id\$/);
    expect(corpo).not.toContain(PAULA.senha);
    expect(corpo).not.toContain('argon2');
    expect(corpo).not.toContain(conta.passwordHash);
  });

  it('na 6ª tentativa em um minuto da mesma origem responde 429, sem bloquear a conta (FR-006)', async () => {
    const origem = novaOrigem();
    for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
      const { resposta } = await entrar(app, { ...PAULA, senha: 'senha-errada-000' }, origem);
      expect(resposta.status).toBe(401);
    }

    const sexta = await entrar(app, PAULA, origem);
    expect(sexta.resposta.status).toBe(429);
    expect(sexta.resposta.body.message).toBe('Muitas tentativas. Tente de novo em instantes.');

    // A conta não ficou bloqueada: a mesma conta entra a partir de outra origem.
    const deOutraOrigem = await entrar(app, PAULA, novaOrigem());
    expect(deOutraOrigem.resposta.status).toBe(200);
  });

  it('recusa corpo fora do formato com 400', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', novaOrigem())
      .send({ email: 'isto-nao-e-email' });
    expect(resposta.status).toBe(400);
  });
});
