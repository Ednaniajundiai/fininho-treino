import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { type CenarioDeFichas, limparFichas, montarCenario } from './apoio-fichas.js';
import { subirApp } from './apoio.js';

type Item = Record<string, unknown>;
type Dia = { titulo: string; itens: Item[] };

// lento: usa o banco de teste.
describe('fichas do professor', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let c: CenarioDeFichas;
  let supino: string; // exercício da Paula
  let agachamento: string; // exercício da Paula
  let remadaDoCaio: string; // exercício do catálogo do Caio

  const http = () => request(app.getHttpServer());
  const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });
  const criar = (token: string, alunoId: string, corpo: Record<string, unknown>) =>
    http().post(`/api/alunos/${alunoId}/fichas`).set(comToken(token)).send(corpo);
  const listar = (token: string, alunoId: string) =>
    http().get(`/api/alunos/${alunoId}/fichas`).set(comToken(token));
  const obter = (token: string, id: string) => http().get(`/api/fichas/${id}`).set(comToken(token));
  const ativar = (token: string, id: string) =>
    http().post(`/api/fichas/${id}/ativar`).set(comToken(token));

  const forca = (exercicioId: string, extra: Item = {}): Item => ({
    tipo: 'forca',
    exercicioId,
    series: 3,
    faixaMin: 8,
    faixaMax: 12,
    unidade: 'repeticoes',
    ...extra,
  });
  const cardio = (extra: Item = {}): Item => ({
    tipo: 'cardio',
    modalidade: 'bike',
    duracaoMinMin: 10,
    duracaoMaxMin: 15,
    ...extra,
  });
  /** Ficha A–E mista: cada dia com força e cardio, numa ordem diferente por dia. */
  const fichaAE = (): Dia[] =>
    ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços'].map((titulo, i) => ({
      titulo,
      itens:
        i % 2 === 0
          ? [
              forca(supino, { observacao: 'cadência lenta' }),
              cardio(),
              forca(agachamento, { series: 4 }),
            ]
          : [
              cardio({ modalidade: 'esteira', duracaoMinMin: 20, duracaoMaxMin: 30 }),
              forca(agachamento),
            ],
    }));
  const umDia = (): Dia[] => [{ titulo: 'Corpo todo', itens: [forca(supino)] }];

  beforeAll(async () => {
    app = await subirApp();
    prisma = app.get(PrismaService);
    c = await montarCenario(app);
  });
  beforeEach(async () => {
    await limparFichas(app);
    const novo = (teacherId: string, name: string) =>
      prisma.exercise.create({ data: { teacherId, name, defaultUnit: 'REPS' } });
    supino = (await novo(c.paula.id, 'Supino reto')).id;
    agachamento = (await novo(c.paula.id, 'Agachamento livre')).id;
    remadaDoCaio = (await novo(c.caio.id, 'Remada curvada')).id;
  });
  afterAll(() => app.close());

  describe('POST /alunos/:alunoId/fichas', () => {
    it('sem token responde 401', async () => {
      const resposta = await http()
        .post(`/api/alunos/${c.alunoDaPaula.id}/fichas`)
        .send({ nome: 'Ficha 1', dias: umDia() });
      expect(resposta.status).toBe(401);
    });

    it('para aluno responde 403, e nada é criado (FR-007)', async () => {
      const resposta = await criar(c.alunoDaPaula.token, c.alunoDaPaula.id, {
        nome: 'Ficha 1',
        dias: umDia(),
      });
      expect(resposta.status).toBe(403);
      expect(await prisma.plan.count()).toBe(0);
    });

    it('aluno de outro professor, id inexistente e id de professor respondem o mesmo 404 (cenário 7)', async () => {
      const corpo = { nome: 'Ficha 1', dias: umDia() };

      const deOutro = await criar(c.paula.token, c.alunoDoCaio.id, corpo);
      const inexistente = await criar(c.paula.token, randomUUID(), corpo);
      const professor = await criar(c.paula.token, c.caio.id, corpo);
      const elaMesma = await criar(c.paula.token, c.paula.id, corpo);

      for (const resposta of [deOutro, inexistente, professor, elaMesma]) {
        expect(resposta.status).toBe(404);
        expect(resposta.body).toEqual(deOutro.body);
      }
      expect(deOutro.body.message).toBe('Aluno não encontrado.');
      expect(await prisma.plan.count()).toBe(0);
    });

    it('cria a ficha A–E mista já ativa, gravada na ordem definida (FR-003, FR-004, FR-012, cenários 3 e 6)', async () => {
      const resposta = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Hipertrofia',
        ativar: true,
        dias: fichaAE(),
      });

      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({
        id: expect.any(String),
        alunoId: c.alunoDaPaula.id,
        professorId: c.paula.id,
        nome: 'Hipertrofia',
        status: 'ativa',
      });
      const lida = await obter(c.paula.token, resposta.body.id);
      expect(lida.status).toBe(200);
      expect(lida.body).toEqual(resposta.body);
      const dias = lida.body.dias as {
        rotulo: string;
        titulo: string;
        ordem: number;
        itens: Item[];
      }[];
      expect(dias.map((d) => [d.ordem, d.rotulo, d.titulo])).toEqual([
        [1, 'A', 'Peito'],
        [2, 'B', 'Costas'],
        [3, 'C', 'Pernas'],
        [4, 'D', 'Ombros'],
        [5, 'E', 'Braços'],
      ]);
      expect(dias[0]?.itens).toEqual([
        {
          ordem: 1,
          tipo: 'forca',
          exercicioId: supino,
          exercicioNome: 'Supino reto',
          series: 3,
          faixaMin: 8,
          faixaMax: 12,
          unidade: 'repeticoes',
          observacao: 'cadência lenta',
        },
        { ordem: 2, tipo: 'cardio', modalidade: 'bike', duracaoMinMin: 10, duracaoMaxMin: 15 },
        {
          ordem: 3,
          tipo: 'forca',
          exercicioId: agachamento,
          exercicioNome: 'Agachamento livre',
          series: 4,
          faixaMin: 8,
          faixaMax: 12,
          unidade: 'repeticoes',
        },
      ]);
      expect(dias[1]?.itens.map((i) => i['tipo'])).toEqual(['cardio', 'forca']);
      expect(dias[1]?.itens[0]).toMatchObject({ modalidade: 'esteira', duracaoMinMin: 20 });
    });

    it('sem "ativar" a ficha nasce como rascunho', async () => {
      const resposta = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Ficha 1',
        dias: umDia(),
      });

      expect(resposta.status).toBe(201);
      expect(resposta.body.status).toBe('rascunho');
    });

    it('aceita as quatro modalidades de cardio e a unidade em segundos', async () => {
      const itens = [
        ...['esteira', 'bike', 'escada', 'livre'].map((modalidade) => cardio({ modalidade })),
        forca(supino, { unidade: 'segundos', faixaMin: 30, faixaMax: 45 }),
      ];
      const resposta = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Ficha 1',
        dias: [{ titulo: 'Misto', itens }],
      });

      expect(resposta.status).toBe(201);
      expect(resposta.body.dias[0].itens.map((i: Item) => i['modalidade'] ?? i['unidade'])).toEqual(
        ['esteira', 'bike', 'escada', 'livre', 'segundos'],
      );
    });
  });

  describe('POST /alunos/:alunoId/fichas: recusas (FR-004, FR-005, FR-011, cenários 4 e 5)', () => {
    const recusa = async (corpo: Record<string, unknown>) => {
      const resposta = await criar(c.paula.token, c.alunoDaPaula.id, corpo);
      expect(resposta.status).toBe(400);
      expect(await prisma.plan.count()).toBe(0);
      return resposta.body.message as string[];
    };

    it('faixa invertida e séries < 1 respondem 400 com o motivo', async () => {
      const motivos = await recusa({
        nome: 'Ficha 1',
        dias: [
          {
            titulo: 'A',
            itens: [forca(supino, { faixaMin: 12, faixaMax: 8 }), forca(supino, { series: 0 })],
          },
        ],
      });
      expect(motivos).toEqual([
        'Dia A, item 1: a faixa mínima não pode ser maior que a máxima.',
        'Dia A, item 2: o número de séries precisa ser 1 ou mais.',
      ]);
    });

    it('cardio com duração invertida responde 400', async () => {
      const motivos = await recusa({
        nome: 'Ficha 1',
        dias: [{ titulo: 'A', itens: [cardio({ duracaoMinMin: 30, duracaoMaxMin: 10 })] }],
      });
      expect(motivos).toEqual(['Dia A, item 1: a duração mínima não pode ser maior que a máxima.']);
    });

    it('ficha sem dia ou com dia sem item não nasce ativa', async () => {
      expect(await recusa({ nome: 'Ficha 1', ativar: true, dias: [] })).toEqual([
        'Para ativar, a ficha precisa de ao menos um dia.',
      ]);
      expect(
        await recusa({
          nome: 'Ficha 1',
          ativar: true,
          dias: [...umDia(), { titulo: 'Vazio', itens: [] }],
        }),
      ).toEqual(['Para ativar, o dia B precisa de ao menos um item.']);
    });

    it('exercício desativado ou do catálogo de outro professor responde 400', async () => {
      await prisma.exercise.update({ where: { id: agachamento }, data: { active: false } });
      const mensagem = ['Exercício não encontrado no seu catálogo ou desativado.'];

      expect(
        await recusa({ nome: 'Ficha 1', dias: [{ titulo: 'A', itens: [forca(agachamento)] }] }),
      ).toEqual(mensagem);
      expect(
        await recusa({ nome: 'Ficha 1', dias: [{ titulo: 'A', itens: [forca(remadaDoCaio)] }] }),
      ).toEqual(mensagem);
      expect(
        await recusa({ nome: 'Ficha 1', dias: [{ titulo: 'A', itens: [forca(randomUUID())] }] }),
      ).toEqual(mensagem);
    });

    it('formato inválido responde 400: tipo, modalidade, unidade, nome vazio, campo extra', async () => {
      await recusa({
        nome: 'Ficha 1',
        dias: [{ titulo: 'A', itens: [{ ...cardio(), tipo: 'yoga' }] }],
      });
      await recusa({
        nome: 'Ficha 1',
        dias: [{ titulo: 'A', itens: [cardio({ modalidade: 'remo' })] }],
      });
      await recusa({
        nome: 'Ficha 1',
        dias: [{ titulo: 'A', itens: [forca(supino, { unidade: 'kg' })] }],
      });
      await recusa({ nome: ' ', dias: umDia() });
      await recusa({
        nome: 'Ficha 1',
        dias: [{ titulo: 'A', rotulo: 'Z', itens: [forca(supino)] }],
      });
      await recusa({
        nome: 'Ficha 1',
        dias: [{ titulo: 'A', itens: [forca(supino, { carga: 40 })] }],
      });
    });

    it('acima de 10 dias responde 400 com o limite', async () => {
      const dias = Array.from({ length: 11 }, () => umDia()[0]);
      expect(await recusa({ nome: 'Ficha 1', dias })).toEqual([
        'A ficha pode ter no máximo 10 dias.',
      ]);
    });
  });

  describe('GET /alunos/:alunoId/fichas e GET /fichas/:id (FR-007)', () => {
    it('sem token respondem 401', async () => {
      expect((await http().get(`/api/alunos/${c.alunoDaPaula.id}/fichas`)).status).toBe(401);
      expect((await http().get(`/api/fichas/${randomUUID()}`)).status).toBe(401);
    });

    it('para aluno respondem 403', async () => {
      const ficha = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Ficha 1',
        dias: umDia(),
      });

      expect((await listar(c.alunoDaPaula.token, c.alunoDaPaula.id)).status).toBe(403);
      expect((await obter(c.alunoDaPaula.token, ficha.body.id)).status).toBe(403);
    });

    it('aluno ou ficha de outro professor respondem 404, igual a id inexistente', async () => {
      const doCaio = await criar(c.caio.token, c.alunoDoCaio.id, {
        nome: 'Ficha do Caio',
        dias: [{ titulo: 'A', itens: [forca(remadaDoCaio)] }],
      });
      expect(doCaio.status).toBe(201);

      const lista = await listar(c.paula.token, c.alunoDoCaio.id);
      const ficha = await obter(c.paula.token, doCaio.body.id);
      const inexistente = await obter(c.paula.token, randomUUID());

      expect(lista.status).toBe(404);
      expect(lista.body.message).toBe('Aluno não encontrado.');
      expect(ficha.status).toBe(404);
      expect(ficha.body.message).toBe('Ficha não encontrada.');
      expect(inexistente.body).toEqual(ficha.body);
    });

    it('id que não é UUID responde 400', async () => {
      expect((await obter(c.paula.token, 'nao-e-uuid')).status).toBe(400);
      expect((await listar(c.paula.token, 'nao-e-uuid')).status).toBe(400);
    });

    it('lista as fichas do aluno, mais nova primeiro, só as dele', async () => {
      const primeira = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Ficha 1',
        dias: umDia(),
      });
      const segunda = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Ficha 2',
        ativar: true,
        dias: umDia(),
      });
      await criar(c.paula.token, c.alunoProvisorio.id, { nome: 'Da Duda', dias: umDia() });

      const lista = await listar(c.paula.token, c.alunoDaPaula.id);

      expect(lista.status).toBe(200);
      expect(lista.body).toEqual([
        {
          id: segunda.body.id,
          alunoId: c.alunoDaPaula.id,
          nome: 'Ficha 2',
          status: 'ativa',
          criadaEm: expect.any(String),
          atualizadaEm: expect.any(String),
        },
        expect.objectContaining({ id: primeira.body.id, status: 'rascunho' }),
      ]);
    });

    it('aluno sem ficha: lista vazia', async () => {
      const lista = await listar(c.paula.token, c.alunoDaPaula.id);
      expect(lista.status).toBe(200);
      expect(lista.body).toEqual([]);
    });
  });

  describe('POST /fichas/:id/ativar (FR-006, FR-007)', () => {
    it('sem token responde 401', async () => {
      expect((await http().post(`/api/fichas/${randomUUID()}/ativar`)).status).toBe(401);
    });

    it('para aluno responde 403, sem ativar', async () => {
      const ficha = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Ficha 1',
        dias: umDia(),
      });

      expect((await ativar(c.alunoDaPaula.token, ficha.body.id)).status).toBe(403);
      expect((await obter(c.paula.token, ficha.body.id)).body.status).toBe('rascunho');
    });

    it('ficha de outro professor responde 404, sem ativar', async () => {
      const doCaio = await criar(c.caio.token, c.alunoDoCaio.id, {
        nome: 'Ficha do Caio',
        dias: [{ titulo: 'A', itens: [forca(remadaDoCaio)] }],
      });

      const resposta = await ativar(c.paula.token, doCaio.body.id);

      expect(resposta.status).toBe(404);
      expect((await obter(c.caio.token, doCaio.body.id)).body.status).toBe('rascunho');
    });

    it('ativa o rascunho e arquiva a ativa anterior do mesmo aluno, que continua legível', async () => {
      const anterior = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Anterior',
        ativar: true,
        dias: fichaAE(),
      });
      const nova = await criar(c.paula.token, c.alunoDaPaula.id, { nome: 'Nova', dias: umDia() });
      // A ficha de outro aluno não é tocada.
      const daDuda = await criar(c.paula.token, c.alunoProvisorio.id, {
        nome: 'Da Duda',
        ativar: true,
        dias: umDia(),
      });

      const resposta = await ativar(c.paula.token, nova.body.id);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({ id: nova.body.id, status: 'ativa' });
      const lida = await obter(c.paula.token, anterior.body.id);
      expect(lida.status).toBe(200);
      expect(lida.body).toEqual({
        ...anterior.body,
        status: 'arquivada',
        atualizadaEm: expect.any(String),
      });
      expect((await obter(c.paula.token, daDuda.body.id)).body.status).toBe('ativa');
      expect(
        await prisma.plan.count({ where: { studentId: c.alunoDaPaula.id, status: 'ACTIVE' } }),
      ).toBe(1);
    });

    it('criar já ativa também arquiva a ativa anterior', async () => {
      const anterior = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Anterior',
        ativar: true,
        dias: umDia(),
      });

      await criar(c.paula.token, c.alunoDaPaula.id, { nome: 'Nova', ativar: true, dias: umDia() });

      expect((await obter(c.paula.token, anterior.body.id)).body.status).toBe('arquivada');
    });

    it('ativar a que já está ativa não muda nada', async () => {
      const ficha = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Ficha 1',
        ativar: true,
        dias: umDia(),
      });

      const resposta = await ativar(c.paula.token, ficha.body.id);

      expect(resposta.status).toBe(200);
      expect(resposta.body.status).toBe('ativa');
    });

    it('rascunho sem dia ou com dia sem item não ativa (FR-005, cenário 5)', async () => {
      const semDia = await criar(c.paula.token, c.alunoDaPaula.id, { nome: 'Sem dia', dias: [] });
      const diaVazio = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Dia vazio',
        dias: [{ titulo: 'Vazio', itens: [] }],
      });

      const r1 = await ativar(c.paula.token, semDia.body.id);
      const r2 = await ativar(c.paula.token, diaVazio.body.id);

      expect(r1.status).toBe(400);
      expect(r1.body.message).toEqual(['Para ativar, a ficha precisa de ao menos um dia.']);
      expect(r2.status).toBe(400);
      expect(r2.body.message).toEqual(['Para ativar, o dia A precisa de ao menos um item.']);
      expect(await prisma.plan.count({ where: { status: 'ACTIVE' } })).toBe(0);
    });
  });
});
