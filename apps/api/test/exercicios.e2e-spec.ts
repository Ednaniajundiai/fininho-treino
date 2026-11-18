import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { type CenarioDeFichas, limparFichas, montarCenario } from './apoio-fichas.js';
import { subirApp } from './apoio.js';

// lento: usa o banco de teste.
describe('catálogo de exercícios: /api/exercicios', () => {
  let app: NestExpressApplication;
  let c: CenarioDeFichas;

  const http = () => request(app.getHttpServer());
  const criar = (token: string, dados: Record<string, unknown>) =>
    http().post('/api/exercicios').set('Authorization', `Bearer ${token}`).send(dados);
  const listar = (token: string) =>
    http().get('/api/exercicios').set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    app = await subirApp();
    c = await montarCenario(app);
  });
  beforeEach(() => limparFichas(app));
  afterAll(() => app.close());

  describe('autorização (FR-007)', () => {
    it('sem token respondem 401', async () => {
      expect((await http().get('/api/exercicios')).status).toBe(401);
      expect(
        (
          await http()
            .post('/api/exercicios')
            .send({ nome: 'Supino reto', unidadePadrao: 'repeticoes' })
        ).status,
      ).toBe(401);
    });

    it('para aluno respondem 403, e nada é criado', async () => {
      const aoCriar = await criar(c.alunoDaPaula.token, {
        nome: 'Supino reto',
        unidadePadrao: 'repeticoes',
      });
      const aoListar = await listar(c.alunoDaPaula.token);

      expect(aoCriar.status).toBe(403);
      expect(aoCriar.body.message).toBe('Sem permissão.');
      expect(aoListar.status).toBe(403);
      expect((await listar(c.paula.token)).body).toEqual([]);
    });
  });

  describe('cadastrar e listar (FR-001, cenário 1)', () => {
    it('o exercício cadastrado aparece no catálogo do professor', async () => {
      const criado = await criar(c.paula.token, {
        nome: '  Supino reto ',
        unidadePadrao: 'repeticoes',
      });

      expect(criado.status).toBe(201);
      expect(criado.body).toEqual({
        id: expect.any(String),
        nome: 'Supino reto',
        unidadePadrao: 'repeticoes',
        ativo: true,
      });
      const lista = await listar(c.paula.token);
      expect(lista.status).toBe(200);
      expect(lista.body).toEqual([criado.body]);
    });

    it('lista em ordem alfabética, com a unidade em segundos', async () => {
      await criar(c.paula.token, { nome: 'Supino reto', unidadePadrao: 'repeticoes' });
      await criar(c.paula.token, { nome: 'Prancha', unidadePadrao: 'segundos' });

      const lista = await listar(c.paula.token);

      expect(
        lista.body.map((e: { nome: string; unidadePadrao: string }) => [e.nome, e.unidadePadrao]),
      ).toEqual([
        ['Prancha', 'segundos'],
        ['Supino reto', 'repeticoes'],
      ]);
    });

    it('o catálogo de um professor é invisível para o outro', async () => {
      await criar(c.paula.token, { nome: 'Supino reto', unidadePadrao: 'repeticoes' });

      expect((await listar(c.caio.token)).body).toEqual([]);
    });

    it('recusa nome vazio, unidade desconhecida e campo extra com 400', async () => {
      expect((await criar(c.paula.token, { nome: '  ', unidadePadrao: 'repeticoes' })).status).toBe(
        400,
      );
      expect(
        (await criar(c.paula.token, { nome: 'Supino reto', unidadePadrao: 'quilos' })).status,
      ).toBe(400);
      expect(
        (
          await criar(c.paula.token, {
            nome: 'Supino reto',
            unidadePadrao: 'repeticoes',
            ativo: false,
          })
        ).status,
      ).toBe(400);
      expect((await listar(c.paula.token)).body).toEqual([]);
    });
  });

  describe('nome duplicado (FR-002, cenário 2)', () => {
    it('recusa com 409 o mesmo nome com outra caixa no catálogo do mesmo professor', async () => {
      await criar(c.paula.token, { nome: 'Supino reto', unidadePadrao: 'repeticoes' });

      const repetido = await criar(c.paula.token, {
        nome: 'SUPINO Reto',
        unidadePadrao: 'segundos',
      });

      expect(repetido.status).toBe(409);
      expect(repetido.body.message).toBe('Já existe um exercício com este nome no seu catálogo.');
      expect((await listar(c.paula.token)).body).toHaveLength(1);
    });

    it('aceita o mesmo nome em catálogos de professores diferentes', async () => {
      await criar(c.paula.token, { nome: 'Supino reto', unidadePadrao: 'repeticoes' });

      const doCaio = await criar(c.caio.token, {
        nome: 'Supino reto',
        unidadePadrao: 'repeticoes',
      });

      expect(doCaio.status).toBe(201);
    });
  });
});
