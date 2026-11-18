import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { type CenarioDeFichas, limparFichas, montarCenario } from './apoio-fichas.js';
import { subirApp } from './apoio.js';

type Item = Record<string, unknown>;
type Dia = { titulo: string; itens: Item[] };

// lento: usa o banco de teste.
describe('GET /minha-ficha (aluno vê a ficha ativa, FR-008)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let c: CenarioDeFichas;
  let supino: string; // exercício da Paula
  let remada: string; // exercício do Caio

  const http = () => request(app.getHttpServer());
  const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });
  const minhaFicha = (token: string) => http().get('/api/minha-ficha').set(comToken(token));
  /** O professor monta a ficha pela rota real, como na US1. */
  const criarFicha = async (
    tokenDoProfessor: string,
    alunoId: string,
    corpo: { nome: string; ativar?: boolean; dias: Dia[] },
  ) => {
    const resposta = await http()
      .post(`/api/alunos/${alunoId}/fichas`)
      .set(comToken(tokenDoProfessor))
      .send(corpo);
    if (resposta.status !== 201) throw new Error(`Falha ao criar ficha: ${resposta.status}`);
    return resposta.body as { id: string; dias: unknown[] };
  };

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
  /** Dois dias mistos, com observação, segundos e cardio sem modalidade. */
  const diasDaPaula = (): Dia[] => [
    {
      titulo: 'Peito',
      itens: [
        forca(supino, { observacao: 'cadência lenta' }),
        cardio({ observacao: 'ritmo leve' }),
        forca(supino, { series: 2, faixaMin: 30, faixaMax: 45, unidade: 'segundos' }),
      ],
    },
    {
      titulo: 'Pernas',
      itens: [cardio({ modalidade: 'esteira', duracaoMinMin: 20, duracaoMaxMin: 30 })],
    },
  ];
  const umDia = (exercicioId: string): Dia[] => [
    { titulo: 'Corpo todo', itens: [forca(exercicioId)] },
  ];

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
    remada = (await novo(c.caio.id, 'Remada curvada')).id;
  });
  afterAll(() => app.close());

  describe('autenticação e papel', () => {
    it('sem token e com token inválido responde 401', async () => {
      const semToken = await http().get('/api/minha-ficha');
      const tokenInvalido = await minhaFicha('isto.nao.e-um-token');

      expect(semToken.status).toBe(401);
      expect(semToken.body.message).toBe('Não autenticado.');
      expect(tokenInvalido.status).toBe(401);
    });

    it('para professor responde 403', async () => {
      const resposta = await minhaFicha(c.paula.token);
      expect(resposta.status).toBe(403);
    });

    it('para aluno com senha provisória responde 403, mesmo com ficha ativa', async () => {
      await criarFicha(c.paula.token, c.alunoProvisorio.id, {
        nome: 'Ficha da Duda',
        ativar: true,
        dias: umDia(supino),
      });

      const resposta = await minhaFicha(c.alunoProvisorio.token);

      expect(resposta.status).toBe(403);
      expect(resposta.body.message).toBe('Troque a senha provisória para continuar.');
      expect(JSON.stringify(resposta.body)).not.toContain('Ficha da Duda');
    });
  });

  describe('a ficha ativa como prescrita (cenário 1)', () => {
    it('o aluno recebe os dias e itens iguais ao prescrito, na ordem, com o nome do exercício', async () => {
      const criada = await criarFicha(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Hipertrofia',
        ativar: true,
        dias: diasDaPaula(),
      });
      const prescrita = await http().get(`/api/fichas/${criada.id}`).set(comToken(c.paula.token));

      const resposta = await minhaFicha(c.alunoDaPaula.token);

      expect(resposta.status).toBe(200);
      expect(resposta.body.ficha).toEqual(prescrita.body);
      expect(resposta.body.ficha).toMatchObject({
        id: criada.id,
        alunoId: c.alunoDaPaula.id,
        status: 'ativa',
      });
      expect(resposta.body.ficha.dias).toEqual([
        {
          rotulo: 'A',
          titulo: 'Peito',
          ordem: 1,
          itens: [
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
            {
              ordem: 2,
              tipo: 'cardio',
              modalidade: 'bike',
              duracaoMinMin: 10,
              duracaoMaxMin: 15,
              observacao: 'ritmo leve',
            },
            {
              ordem: 3,
              tipo: 'forca',
              exercicioId: supino,
              exercicioNome: 'Supino reto',
              series: 2,
              faixaMin: 30,
              faixaMax: 45,
              unidade: 'segundos',
            },
          ],
        },
        {
          rotulo: 'B',
          titulo: 'Pernas',
          ordem: 2,
          itens: [
            {
              ordem: 1,
              tipo: 'cardio',
              modalidade: 'esteira',
              duracaoMinMin: 20,
              duracaoMaxMin: 30,
            },
          ],
        },
      ]);
    });
  });

  describe('sem ficha ativa (cenário 2)', () => {
    it('aluno sem ficha nenhuma recebe ficha nula', async () => {
      const resposta = await minhaFicha(c.alunoDaPaula.token);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ ficha: null });
    });

    it('rascunho nunca é devolvido', async () => {
      await criarFicha(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Rascunho',
        dias: umDia(supino),
      });

      const resposta = await minhaFicha(c.alunoDaPaula.token);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ ficha: null });
    });

    it('a arquivada nunca é devolvida: só com arquivadas, vem nula', async () => {
      const antiga = await criarFicha(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Antiga',
        ativar: true,
        dias: umDia(supino),
      });
      await criarFicha(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Nova',
        ativar: true,
        dias: umDia(supino),
      });
      // A ativa some (como no arquivar da US3), deixando só a arquivada.
      await prisma.plan.updateMany({
        where: { studentId: c.alunoDaPaula.id, status: 'ACTIVE' },
        data: { status: 'ARCHIVED' },
      });

      const resposta = await minhaFicha(c.alunoDaPaula.token);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ ficha: null });
      expect(JSON.stringify(resposta.body)).not.toContain(antiga.id);
    });

    it('com ativa e arquivada, vem só a ativa (FR-006)', async () => {
      const antiga = await criarFicha(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Antiga',
        ativar: true,
        dias: umDia(supino),
      });
      const nova = await criarFicha(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Nova',
        ativar: true,
        dias: umDia(supino),
      });

      const resposta = await minhaFicha(c.alunoDaPaula.token);

      expect(resposta.body.ficha).toMatchObject({ id: nova.id, nome: 'Nova', status: 'ativa' });
      expect(JSON.stringify(resposta.body)).not.toContain(antiga.id);
    });
  });

  describe('isolamento entre alunos e rotas do professor (cenários 3 e 4)', () => {
    it('aluno B vê só a ficha dele, nunca a do aluno A', async () => {
      const deA = await criarFicha(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Ficha do Ari',
        ativar: true,
        dias: umDia(supino),
      });

      const semFicha = await minhaFicha(c.alunoDoCaio.token);
      expect(semFicha.status).toBe(200);
      expect(semFicha.body).toEqual({ ficha: null });

      const deB = await criarFicha(c.caio.token, c.alunoDoCaio.id, {
        nome: 'Ficha da Bia',
        ativar: true,
        dias: umDia(remada),
      });
      const comFicha = await minhaFicha(c.alunoDoCaio.token);

      expect(comFicha.body.ficha).toMatchObject({ id: deB.id, alunoId: c.alunoDoCaio.id });
      const corpo = JSON.stringify(comFicha.body);
      expect(corpo).not.toContain(deA.id);
      expect(corpo).not.toContain(c.alunoDaPaula.id);
      expect(corpo).not.toContain('Ficha do Ari');
      expect(corpo).not.toContain('Supino reto');
    });

    it('aluno recebe 403 nas rotas do professor, mesmo com o id da própria ficha', async () => {
      const ficha = await criarFicha(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Rascunho do Ari',
        dias: umDia(supino),
      });
      const token = comToken(c.alunoDaPaula.token);

      const respostas = [
        await http().get(`/api/fichas/${ficha.id}`).set(token),
        await http().get(`/api/alunos/${c.alunoDaPaula.id}/fichas`).set(token),
        await http()
          .post(`/api/alunos/${c.alunoDaPaula.id}/fichas`)
          .set(token)
          .send({ nome: 'Minha', ativar: true, dias: umDia(supino) }),
        await http().post(`/api/fichas/${ficha.id}/ativar`).set(token),
      ];

      for (const resposta of respostas) expect(resposta.status).toBe(403);
      expect(await prisma.plan.count()).toBe(1);
      expect((await prisma.plan.findUniqueOrThrow({ where: { id: ficha.id } })).status).toBe(
        'DRAFT',
      );
    });
  });
});
