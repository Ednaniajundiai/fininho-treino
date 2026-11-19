import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { type CenarioDeFichas, limparFichas, montarCenario } from './apoio-fichas.js';
import { subirApp } from './apoio.js';

// lento: usa o banco de teste, com as migrations aplicadas do zero no global-setup (é a prova
// de que a migration da 002 sobe num banco vazio).
describe('migration de fichas (regras no banco)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let c: CenarioDeFichas;
  let supino: string;
  let diaId: string;

  const novaFicha = (status: 'DRAFT' | 'ACTIVE' = 'DRAFT') =>
    prisma.plan.create({
      data: { studentId: c.alunoDaPaula.id, teacherId: c.paula.id, name: 'Ficha', status },
    });

  beforeAll(async () => {
    app = await subirApp();
    prisma = app.get(PrismaService);
    c = await montarCenario(app);
  });
  beforeEach(async () => {
    await limparFichas(app);
    supino = (
      await prisma.exercise.create({
        data: { teacherId: c.paula.id, name: 'Supino reto', defaultUnit: 'REPS' },
      })
    ).id;
    const ficha = await novaFicha();
    diaId = (await prisma.planDay.create({ data: { planId: ficha.id, position: 1, title: 'A' } }))
      .id;
  });
  afterAll(() => app.close());

  const forca = {
    type: 'STRENGTH' as const,
    sets: 3,
    rangeMin: 8,
    rangeMax: 12,
    unit: 'REPS' as const,
  };
  const cardio = {
    type: 'CARDIO' as const,
    cardioMode: 'BIKE' as const,
    minutesMin: 10,
    minutesMax: 15,
  };
  const item = (dados: Record<string, unknown>, position = 1) =>
    prisma.planItem.create({ data: { dayId: diaId, position, ...dados } as never });

  describe('CHECK por tipo de item (FR-004)', () => {
    it('aceita item de força e de cardio consistentes', async () => {
      await item({ ...forca, exerciseId: supino }, 1);
      await item(cardio, 2);
      expect(await prisma.planItem.count()).toBe(2);
    });

    it.each([
      ['força sem exercício', { ...forca }],
      ['força com séries 0', { ...forca, exerciseId: 'SUPINO', sets: 0 }],
      ['força com faixa invertida', { ...forca, exerciseId: 'SUPINO', rangeMin: 12, rangeMax: 8 }],
      ['força com campo de cardio', { ...forca, exerciseId: 'SUPINO', cardioMode: 'BIKE' }],
      ['cardio sem modalidade', { ...cardio, cardioMode: null }],
      ['cardio com duração invertida', { ...cardio, minutesMin: 20, minutesMax: 10 }],
      ['cardio com campo de força', { ...cardio, sets: 3 }],
    ])('recusa %s', async (_caso, dados) => {
      const comExercicio = { ...dados } as Record<string, unknown>;
      if (comExercicio['exerciseId'] === 'SUPINO') comExercicio['exerciseId'] = supino;
      await expect(item(comExercicio)).rejects.toThrow(/plan_items_campos_por_tipo/);
    });
  });

  describe('posições únicas (FR-012)', () => {
    it('recusa dois itens na mesma posição do dia', async () => {
      await item(cardio, 1);
      await expect(item(cardio, 1)).rejects.toThrow();
    });
  });

  describe('uma ficha ativa por aluno (FR-006, D-03)', () => {
    it('o índice parcial recusa a segunda ficha ativa do mesmo aluno', async () => {
      await novaFicha('ACTIVE');
      await expect(novaFicha('ACTIVE')).rejects.toThrow();
      // Rascunhos e arquivadas não contam.
      await novaFicha('DRAFT');
      expect(await prisma.plan.count({ where: { status: 'ACTIVE' } })).toBe(1);
    });

    it('duas ativações simultâneas de fichas diferentes deixam uma só ativa, sem erro', async () => {
      const corpo = {
        nome: 'Ficha',
        dias: [
          {
            titulo: 'A',
            itens: [
              {
                tipo: 'forca',
                exercicioId: supino,
                series: 3,
                faixaMin: 8,
                faixaMax: 12,
                unidade: 'repeticoes',
              },
            ],
          },
        ],
      };
      const http = () => request(app.getHttpServer());
      const criar = () =>
        http()
          .post(`/api/alunos/${c.alunoDaPaula.id}/fichas`)
          .set('Authorization', `Bearer ${c.paula.token}`)
          .send(corpo);
      const fichas = [await criar(), await criar(), await criar()];

      const respostas = await Promise.all(
        fichas.map((f) =>
          http()
            .post(`/api/fichas/${f.body.id}/ativar`)
            .set('Authorization', `Bearer ${c.paula.token}`),
        ),
      );

      expect(respostas.map((r) => r.status)).toEqual([200, 200, 200]);
      expect(
        await prisma.plan.count({ where: { studentId: c.alunoDaPaula.id, status: 'ACTIVE' } }),
      ).toBe(1);
    });
  });
});
