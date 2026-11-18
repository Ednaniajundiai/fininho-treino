import { randomUUID } from 'node:crypto';
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
  const alterar = (token: string, id: string, dados: Record<string, unknown>) =>
    http().patch(`/api/exercicios/${id}`).set('Authorization', `Bearer ${token}`).send(dados);
  const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });
  const forca = (exercicioId: string, extra: Record<string, unknown> = {}) => ({
    tipo: 'forca',
    exercicioId,
    series: 3,
    faixaMin: 8,
    faixaMax: 12,
    unidade: 'repeticoes',
    ...extra,
  });
  const criarFicha = (exercicioId: string, extra: Record<string, unknown> = {}) =>
    http()
      .post(`/api/alunos/${c.alunoDaPaula.id}/fichas`)
      .set(comToken(c.paula.token))
      .send({ nome: 'Ficha', dias: [{ titulo: 'Peito', itens: [forca(exercicioId)] }], ...extra });

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
  describe('PATCH /exercicios/:id (FR-011, FR-007, cenário 4)', () => {
    const supinoDaPaula = async () =>
      (await criar(c.paula.token, { nome: 'Supino reto', unidadePadrao: 'repeticoes' })).body as {
        id: string;
        nome: string;
      };

    it('sem token responde 401', async () => {
      const supino = await supinoDaPaula();
      const resposta = await http().patch(`/api/exercicios/${supino.id}`).send({ ativo: false });
      expect(resposta.status).toBe(401);
    });

    it('para aluno responde 403, sem alterar', async () => {
      const supino = await supinoDaPaula();

      const resposta = await alterar(c.alunoDaPaula.token, supino.id, { ativo: false });

      expect(resposta.status).toBe(403);
      expect((await listar(c.paula.token)).body[0].ativo).toBe(true);
    });

    it('exercício de outro professor responde 404, igual a id inexistente, sem alterar', async () => {
      const supino = await supinoDaPaula();

      const deOutro = await alterar(c.caio.token, supino.id, { nome: 'Do Caio' });
      const inexistente = await alterar(c.caio.token, randomUUID(), { nome: 'Do Caio' });

      expect(deOutro.status).toBe(404);
      expect(deOutro.body.message).toBe('Exercício não encontrado.');
      expect(inexistente.body).toEqual(deOutro.body);
      expect((await listar(c.paula.token)).body[0].nome).toBe('Supino reto');
    });

    it('renomeia e muda a unidade padrão', async () => {
      const supino = await supinoDaPaula();

      const resposta = await alterar(c.paula.token, supino.id, {
        nome: ' Supino inclinado ',
        unidadePadrao: 'segundos',
      });

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        id: supino.id,
        nome: 'Supino inclinado',
        unidadePadrao: 'segundos',
        ativo: true,
      });
      expect((await listar(c.paula.token)).body).toEqual([resposta.body]);
    });

    it('renomear para um nome que já existe no catálogo responde 409', async () => {
      const supino = await supinoDaPaula();
      await criar(c.paula.token, { nome: 'Prancha', unidadePadrao: 'segundos' });

      const resposta = await alterar(c.paula.token, supino.id, { nome: 'PRANCHA' });

      expect(resposta.status).toBe(409);
      expect(resposta.body.message).toBe('Já existe um exercício com este nome no seu catálogo.');
    });

    it('recusa nome vazio, unidade desconhecida e campo extra com 400', async () => {
      const supino = await supinoDaPaula();

      expect((await alterar(c.paula.token, supino.id, { nome: '  ' })).status).toBe(400);
      expect((await alterar(c.paula.token, supino.id, { unidadePadrao: 'quilos' })).status).toBe(
        400,
      );
      expect((await alterar(c.paula.token, supino.id, { teacherId: c.caio.id })).status).toBe(400);
    });

    it('desativado some das novas escolhas e continua na ficha existente e na do aluno', async () => {
      const supino = await supinoDaPaula();
      const ficha = (await criarFicha(supino.id, { ativar: true })).body as { id: string };

      const desativado = await alterar(c.paula.token, supino.id, { ativo: false });

      expect(desativado.status).toBe(200);
      expect(desativado.body.ativo).toBe(false);
      // Continua no catálogo, marcado como desativado (nunca é apagado).
      expect((await listar(c.paula.token)).body).toEqual([desativado.body]);
      // Some das novas escolhas: ficha nova com ele é recusada.
      const nova = await criarFicha(supino.id);
      expect(nova.status).toBe(400);
      expect(nova.body.message).toEqual([
        'Exercício não encontrado no seu catálogo ou desativado.',
      ]);
      // Continua na ficha que já o usa, para o professor e para o aluno.
      const lida = await http().get(`/api/fichas/${ficha.id}`).set(comToken(c.paula.token));
      expect(lida.body.dias[0].itens[0]).toMatchObject({
        exercicioId: supino.id,
        exercicioNome: 'Supino reto',
      });
      const doAluno = await http().get('/api/minha-ficha').set(comToken(c.alunoDaPaula.token));
      expect(doAluno.body.ficha.dias[0].itens[0].exercicioId).toBe(supino.id);
      // A ficha que já o usa continua editável com ele (FR-009).
      const editada = await http()
        .put(`/api/fichas/${ficha.id}`)
        .set(comToken(c.paula.token))
        .send({
          nome: 'Ficha',
          dias: [{ titulo: 'Peito', itens: [forca(supino.id, { series: 5 })] }],
        });
      expect(editada.status).toBe(200);
      expect(editada.body.dias[0].itens[0].series).toBe(5);
    });

    it('reativado volta às novas escolhas', async () => {
      const supino = await supinoDaPaula();
      await alterar(c.paula.token, supino.id, { ativo: false });

      const reativado = await alterar(c.paula.token, supino.id, { ativo: true });

      expect(reativado.status).toBe(200);
      expect(reativado.body.ativo).toBe(true);
      expect((await criarFicha(supino.id)).status).toBe(201);
    });
  });
});
