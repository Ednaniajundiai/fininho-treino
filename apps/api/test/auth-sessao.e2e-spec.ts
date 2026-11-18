import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  cookieDeRenovacao,
  criarProfessor,
  entrar,
  limparBanco,
  linhaDoCookie,
  PAULA,
  subirApp,
} from './apoio.js';

// lento: usa o banco de teste.
describe('sessão de acesso: renovação e logout', () => {
  let app: NestExpressApplication;

  const renovar = (cookie?: string) => {
    const pedido = request(app.getHttpServer()).post('/api/auth/refresh');
    return cookie ? pedido.set('Cookie', cookie) : pedido;
  };
  const sair = (cookie?: string) => {
    const pedido = request(app.getHttpServer()).post('/api/auth/logout');
    return cookie ? pedido.set('Cookie', cookie) : pedido;
  };
  const minhaConta = (accessToken: string) =>
    request(app.getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);

  beforeAll(async () => {
    app = await subirApp();
  });
  beforeEach(async () => {
    await limparBanco(app);
    await criarProfessor(app);
  });
  afterAll(() => app.close());

  it('o login grava o cookie de renovação httpOnly, Secure, SameSite=Strict, restrito a /api/auth, por 7 dias (FR-007)', async () => {
    const { resposta } = await entrar(app, PAULA);
    const linha = linhaDoCookie(resposta) ?? '';

    expect(linha).toMatch(/; HttpOnly/i);
    expect(linha).toMatch(/; Secure/i);
    expect(linha).toMatch(/; SameSite=Strict/i);
    expect(linha).toMatch(/; Path=\/api\/auth(;|$)/i);
    expect(linha).toMatch(/; Max-Age=604800(;|$)/i);
  });

  it('o banco guarda só o hash do token de renovação, nunca o valor (FR-007)', async () => {
    const { cookie } = await entrar(app, PAULA);
    const valor = decodeURIComponent(cookie.split('=')[1] ?? '');
    const guardados = await app.get(PrismaService).refreshToken.findMany();

    expect(guardados).toHaveLength(1);
    expect(guardados[0]?.tokenHash).not.toBe(valor);
    expect(JSON.stringify(guardados)).not.toContain(valor);
  });

  it('a renovação emite novo token de acesso e gira o token de renovação (FR-007)', async () => {
    const login = await entrar(app, PAULA);

    const renovacao = await renovar(login.cookie);
    const novoCookie = cookieDeRenovacao(renovacao);

    expect(renovacao.status).toBe(200);
    expect(novoCookie).toBeDefined();
    expect(novoCookie).not.toBe(login.cookie);
    expect(renovacao.body.usuario.email).toBe(PAULA.email);
    // O token de acesso novo funciona, e o cookie novo renova de novo.
    expect((await minhaConta(renovacao.body.accessToken)).status).toBe(200);
    expect((await renovar(novoCookie)).status).toBe(200);
  });

  it('reuso de um token já girado derruba todas as sessões daquele login, e só dele (FR-008)', async () => {
    const celular = await entrar(app, PAULA);
    const computador = await entrar(app, PAULA);
    const girado = await renovar(celular.cookie);
    const cookieAtualDoCelular = cookieDeRenovacao(girado);

    // Alguém apresenta de novo o token antigo do celular (cenário de roubo).
    const reuso = await renovar(celular.cookie);

    expect(reuso.status).toBe(401);
    // A família inteira caiu: nem o token mais novo do celular renova.
    expect((await renovar(cookieAtualDoCelular)).status).toBe(401);
    // O login do computador é outra família e segue valendo.
    expect((await renovar(computador.cookie)).status).toBe(200);
  });

  it('o token de acesso vale 15 minutos e o de renovação 7 dias, recontados a cada renovação (FR-007)', async () => {
    const prisma = app.get(PrismaService);
    const seteDias = 7 * 24 * 60 * 60 * 1000;
    const prazoDoAcesso = (accessToken: string) => {
      const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString(),
      ) as { iat: number; exp: number };
      return payload.exp - payload.iat;
    };
    const prazoDaRenovacaoMaisNova = async () => {
      const token = await prisma.refreshToken.findFirstOrThrow({ orderBy: { createdAt: 'desc' } });
      return token.expiresAt.getTime() - Date.now();
    };

    const login = await entrar(app, PAULA);
    expect(prazoDoAcesso(login.accessToken)).toBe(15 * 60);
    expect(Math.abs((await prazoDaRenovacaoMaisNova()) - seteDias)).toBeLessThan(60_000);

    // Envelhece o token atual: a renovação conta 7 dias de novo, a partir dela.
    await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() + 60_000) } });
    const renovacao = await renovar(login.cookie);
    expect(prazoDoAcesso(renovacao.body.accessToken)).toBe(15 * 60);
    expect(Math.abs((await prazoDaRenovacaoMaisNova()) - seteDias)).toBeLessThan(60_000);
  });

  it('duas renovações simultâneas do mesmo token não deixam nenhum token vivo (FR-008)', async () => {
    const { cookie } = await entrar(app, PAULA);

    const respostas = await Promise.all([renovar(cookie), renovar(cookie)]);

    // Este teste não distingue sozinho o código com e sem transação (a janela da corrida é de
    // milissegundos): a garantia é a transação com trava por conta em SessoesService.renovar.
    // No máximo uma passa; a outra é reuso e revoga a família, inclusive o token recém-emitido.
    expect(respostas.filter((resposta) => resposta.status === 200).length).toBeLessThanOrEqual(1);
    for (const resposta of respostas) {
      const emitido = cookieDeRenovacao(resposta);
      if (resposta.status === 200 && emitido) expect((await renovar(emitido)).status).toBe(401);
    }
    const vivos = await app
      .get(PrismaService)
      .refreshToken.count({ where: { usedAt: null, revokedAt: null } });
    expect(vivos).toBe(0);
  });

  it('token de renovação vencido responde 401 (FR-007)', async () => {
    const { cookie } = await entrar(app, PAULA);
    await app
      .get(PrismaService)
      .refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect((await renovar(cookie)).status).toBe(401);
  });

  it('renovação sem cookie ou com valor desconhecido responde 401 (FR-007)', async () => {
    expect((await renovar()).status).toBe(401);
    expect((await renovar('ft_refresh=valor-que-nunca-existiu')).status).toBe(401);
  });

  it('sair revoga só a sessão do aparelho; a do outro aparelho segue renovando (FR-009)', async () => {
    const celular = await entrar(app, PAULA);
    const computador = await entrar(app, PAULA);

    // Só o cookie, sem token de acesso: sair vale mesmo com o acesso de 15 min vencido (FR-010).
    const saida = await sair(celular.cookie);

    expect(saida.status).toBe(204);
    expect(linhaDoCookie(saida)).toMatch(/^ft_refresh=;/);
    expect((await renovar(celular.cookie)).status).toBe(401);
    expect((await renovar(computador.cookie)).status).toBe(200);
  });

  it('sair sem cookie responde sem erro e sem efeito (FR-009)', async () => {
    const { cookie } = await entrar(app, PAULA);

    expect((await sair()).status).toBe(204);
    expect((await renovar(cookie)).status).toBe(200);
  });
});
