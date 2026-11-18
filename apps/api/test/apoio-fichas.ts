import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CAIO, criarProfessor, entrar, limparBanco, novaOrigem, PAULA } from './apoio.js';

// Contas fictícias da 002 (princípio II): domínio reservado .test, nomes inventados.
const ARI = { nome: 'Ari Alves', email: 'ari@exemplo.test' };
const BIA = { nome: 'Bia Barros', email: 'bia@exemplo.test' };
const DUDA = { nome: 'Duda Dias', email: 'duda@exemplo.test' };
const NOVA_SENHA = 'senha-definitiva-1';

export type Conta = { id: string; token: string };

/**
 * Professora Paula (A) com os alunos Ari (senha já trocada) e Duda (ainda provisória);
 * professor Caio (B) com a aluna Bia (senha já trocada).
 */
export type CenarioDeFichas = {
  paula: Conta;
  caio: Conta;
  alunoDaPaula: Conta;
  alunoDoCaio: Conta;
  alunoProvisorio: Conta;
};

/**
 * Monta o cenário do zero. É lento (argon2 em cada login e troca de senha): chame no
 * beforeAll e use limparFichas no beforeEach.
 */
export async function montarCenario(app: NestExpressApplication): Promise<CenarioDeFichas> {
  await limparBanco(app);
  const prisma = app.get(PrismaService);
  await criarProfessor(app, PAULA);
  await criarProfessor(app, CAIO);
  const paula = await contaDoProfessor(app, prisma, PAULA);
  const caio = await contaDoProfessor(app, prisma, CAIO);

  return {
    paula,
    caio,
    alunoDaPaula: await criarAluno(app, paula.token, ARI, { trocarSenha: true }),
    alunoDoCaio: await criarAluno(app, caio.token, BIA, { trocarSenha: true }),
    alunoProvisorio: await criarAluno(app, paula.token, DUDA, { trocarSenha: false }),
  };
}

/** Apaga catálogo e fichas, mantendo as contas do cenário. */
export async function limparFichas(app: NestExpressApplication): Promise<void> {
  await app.get(PrismaService).$executeRawUnsafe('TRUNCATE TABLE "plans", "exercises" CASCADE');
}

async function contaDoProfessor(
  app: NestExpressApplication,
  prisma: PrismaService,
  dados: { email: string; senha: string },
): Promise<Conta> {
  const { id } = await prisma.user.findUniqueOrThrow({ where: { email: dados.email } });
  return { id, token: (await entrar(app, dados)).accessToken };
}

/** O aluno nasce por POST /api/alunos, como na API real, com senha provisória. */
async function criarAluno(
  app: NestExpressApplication,
  tokenDoProfessor: string,
  dados: { nome: string; email: string },
  { trocarSenha }: { trocarSenha: boolean },
): Promise<Conta> {
  const criado = await request(app.getHttpServer())
    .post('/api/alunos')
    .set('Authorization', `Bearer ${tokenDoProfessor}`)
    .send(dados);
  if (criado.status !== 201) throw new Error(`Falha ao criar aluno: ${criado.status}`);
  const id = criado.body.aluno.id as string;
  const senhaProvisoria = criado.body.senhaProvisoria as string;
  const login = await entrar(app, { email: dados.email, senha: senhaProvisoria });
  if (!trocarSenha) return { id, token: login.accessToken };

  const troca = await request(app.getHttpServer())
    .post('/api/auth/trocar-senha')
    .set('Authorization', `Bearer ${login.accessToken}`)
    .set('X-Forwarded-For', novaOrigem())
    .send({ senhaAtual: senhaProvisoria, novaSenha: NOVA_SENHA });
  if (troca.status !== 200) throw new Error(`Falha ao trocar a senha: ${troca.status}`);
  return { id, token: troca.body.accessToken as string };
}
