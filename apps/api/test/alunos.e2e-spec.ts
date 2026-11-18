import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CAIO, criarProfessor, entrar, limparBanco, PAULA, subirApp } from './apoio.js';

const ARI = { nome: 'Ari Alves', email: 'ari@exemplo.test' };
const BIA = { nome: 'Bia Barros', email: 'bia@exemplo.test' };

// lento: usa o banco de teste.
describe('contas de aluno: /api/alunos', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let paula: string; // token de acesso da professora Paula
  let caio: string; // token de acesso do professor Caio

  const http = () => request(app.getHttpServer());
  const criar = (token: string, dados: { nome: string; email: string }) =>
    http().post('/api/alunos').set('Authorization', `Bearer ${token}`).send(dados);
  const listar = (token: string) =>
    http().get('/api/alunos').set('Authorization', `Bearer ${token}`);
  const redefinir = (token: string, id: string) =>
    http().post(`/api/alunos/${id}/redefinir-senha`).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    app = await subirApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => {
    await limparBanco(app);
    await criarProfessor(app, PAULA);
    await criarProfessor(app, CAIO);
    paula = (await entrar(app, PAULA)).accessToken;
    caio = (await entrar(app, CAIO)).accessToken;
  });
  afterAll(() => app.close());

  describe('criar (FR-012, FR-013)', () => {
    it('o professor cria o aluno vinculado a ele e recebe a senha provisória uma vez', async () => {
      const resposta = await criar(paula, ARI);

      expect(resposta.status).toBe(201);
      expect(resposta.body.aluno).toEqual({
        id: expect.any(String),
        nome: 'Ari Alves',
        email: 'ari@exemplo.test',
        papel: 'ALUNO',
        senhaProvisoria: true,
      });
      expect(resposta.body.senhaProvisoria).toEqual(expect.any(String));
      expect(Object.keys(resposta.body).sort()).toEqual(['aluno', 'senhaProvisoria']);

      const noBanco = await prisma.user.findUniqueOrThrow({ where: { email: ARI.email } });
      const professora = await prisma.user.findUniqueOrThrow({ where: { email: PAULA.email } });
      expect(noBanco.teacherId).toBe(professora.id);
      // Guardada só como hash: o valor mostrado não fica em lugar nenhum (FR-019).
      expect(noBanco.passwordHash).toMatch(/^\$argon2id\$/);
      expect(JSON.stringify(noBanco)).not.toContain(resposta.body.senhaProvisoria);
    });

    it('o aluno entra com a senha provisória recebida', async () => {
      const { body } = await criar(paula, ARI);

      const login = await entrar(app, { email: ARI.email, senha: body.senhaProvisoria });

      expect(login.resposta.status).toBe(200);
      expect(login.resposta.body.usuario).toMatchObject({ papel: 'ALUNO', senhaProvisoria: true });
    });

    it('a senha provisória não é consultável depois: a listagem não a traz (FR-013)', async () => {
      const { body } = await criar(paula, ARI);

      const lista = await listar(paula);

      expect(JSON.stringify(lista.body)).not.toContain(body.senhaProvisoria);
      expect(lista.body[0]).not.toHaveProperty('senhaProvisoriaValor');
      expect(Object.keys(lista.body[0]).sort()).toEqual(
        ['email', 'id', 'nome', 'papel', 'senhaProvisoria'].sort(),
      );
    });

    it('recusa e-mail já usado, mesmo com outra caixa e espaços, e nada é criado (FR-014)', async () => {
      await criar(paula, ARI);

      const repetido = await criar(caio, { nome: 'Outro Ari', email: '  ARI@Exemplo.Test ' });
      const deProfessor = await criar(paula, { nome: 'Caio Clone', email: CAIO.email });

      expect(repetido.status).toBe(409);
      expect(repetido.body.message).toBe('E-mail já cadastrado.');
      expect(deProfessor.status).toBe(409);
      expect(await prisma.user.count({ where: { role: 'ALUNO' } })).toBe(1);
    });

    it('não aceita o professor no corpo: o vínculo vem só de quem está logado (FR-012)', async () => {
      const outro = await prisma.user.findUniqueOrThrow({ where: { email: CAIO.email } });

      const resposta = await http()
        .post('/api/alunos')
        .set('Authorization', `Bearer ${paula}`)
        .send({ ...ARI, teacherId: outro.id });

      expect(resposta.status).toBe(400);
      expect(await prisma.user.count({ where: { role: 'ALUNO' } })).toBe(0);
    });

    it('recusa nome vazio ou e-mail inválido com 400', async () => {
      expect((await criar(paula, { nome: '', email: 'bia@exemplo.test' })).status).toBe(400);
      expect((await criar(paula, { nome: 'Bia Barros', email: 'nao-e-email' })).status).toBe(400);
    });
  });

  describe('listar (FR-015)', () => {
    it('cada professor vê só os alunos dele', async () => {
      await criar(paula, ARI);
      await criar(caio, BIA);

      const daPaula = await listar(paula);
      const doCaio = await listar(caio);

      expect(daPaula.status).toBe(200);
      expect(daPaula.body.map((aluno: { email: string }) => aluno.email)).toEqual([ARI.email]);
      expect(doCaio.body.map((aluno: { email: string }) => aluno.email)).toEqual([BIA.email]);
    });

    it('professor sem alunos recebe lista vazia', async () => {
      const resposta = await listar(paula);
      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual([]);
    });
  });

  describe('redefinir senha (FR-016)', () => {
    it('gera nova provisória, invalida a anterior e derruba as sessões do aluno', async () => {
      const criado = await criar(paula, ARI);
      const sessaoDoAluno = await entrar(app, {
        email: ARI.email,
        senha: criado.body.senhaProvisoria,
      });

      const resposta = await redefinir(paula, criado.body.aluno.id);

      expect(resposta.status).toBe(200);
      expect(resposta.body.senhaProvisoria).toEqual(expect.any(String));
      expect(resposta.body.senhaProvisoria).not.toBe(criado.body.senhaProvisoria);
      expect(resposta.body.aluno).toMatchObject({ email: ARI.email, senhaProvisoria: true });
      // A anterior não entra mais; a nova entra.
      const comAntiga = await entrar(app, { email: ARI.email, senha: criado.body.senhaProvisoria });
      const comNova = await entrar(app, { email: ARI.email, senha: resposta.body.senhaProvisoria });
      expect(comAntiga.resposta.status).toBe(401);
      expect(comNova.resposta.status).toBe(200);
      // A sessão que o aluno tinha aberta não renova mais.
      const renovacao = await http().post('/api/auth/refresh').set('Cookie', sessaoDoAluno.cookie);
      expect(renovacao.status).toBe(401);
    });

    it('volta a exigir a troca de senha de aluno que já tinha senha definitiva', async () => {
      const criado = await criar(paula, ARI);
      await prisma.user.update({
        where: { id: criado.body.aluno.id },
        data: { mustChangePassword: false },
      });

      const resposta = await redefinir(paula, criado.body.aluno.id);

      expect(resposta.body.aluno.senhaProvisoria).toBe(true);
    });

    it('aluno de outro professor e aluno inexistente respondem o mesmo 404, sem alterar nada', async () => {
      const doCaio = await criar(caio, BIA);

      const deOutro = await redefinir(paula, doCaio.body.aluno.id);
      const inexistente = await redefinir(paula, randomUUID());

      expect(deOutro.status).toBe(404);
      expect(inexistente.status).toBe(404);
      expect(deOutro.body).toEqual(inexistente.body);
      // A senha da Bia continua valendo: nada foi alterado.
      const login = await entrar(app, { email: BIA.email, senha: doCaio.body.senhaProvisoria });
      expect(login.resposta.status).toBe(200);
    });

    it('o professor não redefine por esta rota a senha de outro professor (404)', async () => {
      const outroProfessor = await prisma.user.findUniqueOrThrow({ where: { email: CAIO.email } });
      expect((await redefinir(paula, outroProfessor.id)).status).toBe(404);
    });

    it('id que não é UUID responde 400', async () => {
      expect((await redefinir(paula, 'nao-e-uuid')).status).toBe(400);
    });
  });

  describe('autorização das três rotas (FR-010, FR-012)', () => {
    it('sem token respondem 401', async () => {
      expect((await http().post('/api/alunos').send(ARI)).status).toBe(401);
      expect((await http().get('/api/alunos')).status).toBe(401);
      expect((await http().post(`/api/alunos/${randomUUID()}/redefinir-senha`)).status).toBe(401);
    });

    it('para aluno logado respondem 403 "sem permissão", e nada é criado', async () => {
      const criado = await criar(paula, ARI);
      // Senha já definitiva, para o 403 vir do papel e não da senha provisória.
      await prisma.user.update({
        where: { id: criado.body.aluno.id },
        data: { mustChangePassword: false },
      });
      const aluno = (await entrar(app, { email: ARI.email, senha: criado.body.senhaProvisoria }))
        .accessToken;

      const aoCriar = await criar(aluno, BIA);
      const aoListar = await listar(aluno);
      const aoRedefinir = await redefinir(aluno, criado.body.aluno.id);

      expect(aoCriar.status).toBe(403);
      expect(aoCriar.body.message).toBe('Sem permissão.');
      expect(aoListar.status).toBe(403);
      expect(aoRedefinir.status).toBe(403);
      expect(await prisma.user.count({ where: { role: 'ALUNO' } })).toBe(1);
    });
  });
});
