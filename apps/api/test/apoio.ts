import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configurarApp } from '../src/app.setup.js';
import { COOKIE_DE_RENOVACAO } from '../src/auth/cookie.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { UsuariosService } from '../src/usuarios/usuarios.service.js';

/** Sobe a API como em produção (mesmo prefixo, pipes e cookies), sem abrir porta. */
export async function subirApp(): Promise<NestExpressApplication> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication<NestExpressApplication>();
  configurarApp(app);
  await app.init();
  return app;
}

export async function limparBanco(app: NestExpressApplication): Promise<void> {
  await app.get(PrismaService).$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
}

// Contas fictícias (princípio II): domínio reservado .test, nomes inventados.
export const PAULA = {
  nome: 'Paula Prado',
  email: 'paula@exemplo.test',
  senha: 'senha-da-paula-1',
};
export const CAIO = { nome: 'Caio Costa', email: 'caio@exemplo.test', senha: 'senha-do-caio-1' };

export function criarProfessor(app: NestExpressApplication, dados = PAULA) {
  return app.get(UsuariosService).criarProfessor(dados);
}

let origens = 0;
/**
 * Cada chamada simula um endereço de origem diferente (faixa de documentação 198.18.0.0/15),
 * para o limite de tentativas de login de um teste não contaminar o outro.
 */
export function novaOrigem(): string {
  origens += 1;
  return `198.18.${Math.floor(origens / 250)}.${(origens % 250) + 1}`;
}

/** O par "nome=valor" do cookie de renovação que a resposta gravou, pronto para o header Cookie. */
export function cookieDeRenovacao(resposta: Response): string | undefined {
  return linhaDoCookie(resposta)?.split(';')[0];
}

/** A linha Set-Cookie inteira, com os atributos. */
export function linhaDoCookie(resposta: Response): string | undefined {
  const cabecalho = resposta.headers['set-cookie'] as unknown as string[] | string | undefined;
  const linhas = Array.isArray(cabecalho) ? cabecalho : cabecalho ? [cabecalho] : [];
  return linhas.find((linha) => linha.startsWith(`${COOKIE_DE_RENOVACAO}=`));
}

export async function entrar(
  app: NestExpressApplication,
  credenciais: { email: string; senha: string },
  origem = novaOrigem(),
): Promise<{ resposta: Response; accessToken: string; cookie: string }> {
  const resposta = await request(app.getHttpServer())
    .post('/api/auth/login')
    .set('X-Forwarded-For', origem)
    .send({ email: credenciais.email, senha: credenciais.senha });
  return {
    resposta,
    accessToken: resposta.body.accessToken as string,
    cookie: cookieDeRenovacao(resposta) as string,
  };
}
