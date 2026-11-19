import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { type CenarioDeFichas, limparFichas, montarCenario } from './apoio-fichas.js';
import { subirApp } from './apoio.js';

type Item = Record<string, unknown>;
type Dia = { titulo: string; itens: Item[] };
type Ficha = { id: string; nome: string; status: string; alunoId: string; dias: DiaLido[] };
type DiaLido = { rotulo: string; titulo: string; ordem: number; itens: Item[] };

// lento: usa o banco de teste.
describe('fichas: editar, arquivar, trocar e duplicar (História 3)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let c: CenarioDeFichas;
  let supino: string; // exercício da Paula
  let agachamento: string; // exercício da Paula
  let remadaDoCaio: string; // exercício do catálogo do Caio

  const http = () => request(app.getHttpServer());
  const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });
  const obter = (token: string, id: string) => http().get(`/api/fichas/${id}`).set(comToken(token));
  const salvar = (token: string, id: string, corpo: Record<string, unknown>) =>
    http().put(`/api/fichas/${id}`).set(comToken(token)).send(corpo);
  const ativar = (token: string, id: string) =>
    http().post(`/api/fichas/${id}/ativar`).set(comToken(token));
  const arquivar = (token: string, id: string) =>
    http().post(`/api/fichas/${id}/arquivar`).set(comToken(token));
  const duplicar = (token: string, id: string, corpo: Record<string, unknown>) =>
    http().post(`/api/fichas/${id}/duplicar`).set(comToken(token)).send(corpo);
  const minhaFicha = (token: string) => http().get('/api/minha-ficha').set(comToken(token));

  /** O professor monta a ficha pela rota real da US1. */
  const criar = async (
    tokenDoProfessor: string,
    alunoId: string,
    corpo: { nome: string; ativar?: boolean; dias: Dia[] },
  ): Promise<Ficha> => {
    const resposta = await http()
      .post(`/api/alunos/${alunoId}/fichas`)
      .set(comToken(tokenDoProfessor))
      .send(corpo);
    if (resposta.status !== 201) throw new Error(`Falha ao criar ficha: ${resposta.status}`);
    return resposta.body as Ficha;
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
  const tresDias = (): Dia[] => [
    { titulo: 'Peito', itens: [forca(supino), cardio()] },
    { titulo: 'Pernas', itens: [forca(agachamento, { series: 4 })] },
    { titulo: 'Cardio', itens: [cardio({ modalidade: 'esteira' })] },
  ];
  const umDia = (): Dia[] => [{ titulo: 'Corpo todo', itens: [forca(supino)] }];
  const fichaDaPaula = (ativa = true) =>
    criar(c.paula.token, c.alunoDaPaula.id, {
      nome: 'Hipertrofia',
      ativar: ativa,
      dias: tresDias(),
    });

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

  describe('PUT /fichas/:id (FR-009, FR-007)', () => {
    it('sem token responde 401', async () => {
      const ficha = await fichaDaPaula();
      const resposta = await http()
        .put(`/api/fichas/${ficha.id}`)
        .send({ nome: 'Outra', dias: umDia() });
      expect(resposta.status).toBe(401);
    });

    it('para aluno responde 403, sem alterar a ficha', async () => {
      const ficha = await fichaDaPaula();

      const resposta = await salvar(c.alunoDaPaula.token, ficha.id, {
        nome: 'Minha',
        dias: umDia(),
      });

      expect(resposta.status).toBe(403);
      expect((await obter(c.paula.token, ficha.id)).body).toEqual(ficha);
    });

    it('ficha de outro professor responde 404, igual a id inexistente, sem alterar', async () => {
      const ficha = await fichaDaPaula();
      const corpo = { nome: 'Do Caio', dias: [{ titulo: 'X', itens: [forca(remadaDoCaio)] }] };

      const deOutro = await salvar(c.caio.token, ficha.id, corpo);
      const inexistente = await salvar(c.caio.token, randomUUID(), corpo);

      expect(deOutro.status).toBe(404);
      expect(inexistente.status).toBe(404);
      expect(deOutro.body).toEqual(inexistente.body);
      expect(deOutro.body.message).toBe('Ficha não encontrada.');
      expect((await obter(c.paula.token, ficha.id)).body).toEqual(ficha);
    });

    it('editar as séries de um item da ficha ativa chega ao aluno (cenário 1)', async () => {
      const ficha = await fichaDaPaula();
      const dias = tresDias();
      dias[1]!.itens[0] = forca(agachamento, { series: 5, observacao: 'subir o peso' });

      const resposta = await salvar(c.paula.token, ficha.id, { nome: 'Hipertrofia 2', dias });

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({ id: ficha.id, nome: 'Hipertrofia 2', status: 'ativa' });
      expect(resposta.body.dias[1].itens[0]).toMatchObject({
        exercicioId: agachamento,
        series: 5,
        observacao: 'subir o peso',
      });
      const doAluno = await minhaFicha(c.alunoDaPaula.token);
      expect(doAluno.body.ficha).toEqual(resposta.body);
      expect(doAluno.body.ficha.dias[1].itens[0].series).toBe(5);
    });

    it('substitui dias e itens: remover e reordenar dias mantém os rótulos A, B em sequência (FR-012)', async () => {
      const ficha = await fichaDaPaula();
      const [peito, , cardioDia] = tresDias();

      const resposta = await salvar(c.paula.token, ficha.id, {
        nome: 'Hipertrofia',
        dias: [cardioDia, peito],
      });

      expect(resposta.status).toBe(200);
      expect(resposta.body.dias.map((d: DiaLido) => [d.rotulo, d.ordem, d.titulo])).toEqual([
        ['A', 1, 'Cardio'],
        ['B', 2, 'Peito'],
      ]);
      expect(resposta.body.dias[1].itens.map((i: Item) => i.tipo)).toEqual(['forca', 'cardio']);
      expect((await obter(c.paula.token, ficha.id)).body).toEqual(resposta.body);
      expect(await prisma.planDay.count({ where: { planId: ficha.id } })).toBe(2);
    });

    it('rascunho pode ser salvo vazio e continua rascunho', async () => {
      const rascunho = await fichaDaPaula(false);

      const resposta = await salvar(c.paula.token, rascunho.id, { nome: 'Em montagem', dias: [] });

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({ status: 'rascunho', nome: 'Em montagem', dias: [] });
    });

    it('não aceita mudar o status pelo PUT: campo extra responde 400', async () => {
      const rascunho = await fichaDaPaula(false);

      const resposta = await salvar(c.paula.token, rascunho.id, {
        nome: 'X',
        ativar: true,
        dias: umDia(),
      });

      expect(resposta.status).toBe(400);
      expect((await obter(c.paula.token, rascunho.id)).body.status).toBe('rascunho');
    });
  });

  describe('PUT /fichas/:id: recusas (FR-005, cenário 6)', () => {
    it('mais de 10 dias responde 400 com o limite, sem alterar', async () => {
      const ficha = await fichaDaPaula();
      const dias = Array.from({ length: 11 }, () => ({ titulo: 'Dia', itens: [forca(supino)] }));

      const resposta = await salvar(c.paula.token, ficha.id, { nome: 'Longa', dias });

      expect(resposta.status).toBe(400);
      expect(resposta.body.message).toEqual(['A ficha pode ter no máximo 10 dias.']);
      expect((await obter(c.paula.token, ficha.id)).body).toEqual(ficha);
    });

    it('mais de 30 itens num dia responde 400 com o limite, mesmo em rascunho', async () => {
      const rascunho = await fichaDaPaula(false);
      const itens = Array.from({ length: 31 }, () => forca(supino));

      const resposta = await salvar(c.paula.token, rascunho.id, {
        nome: 'Cheia',
        dias: [
          { titulo: 'Peito', itens: [forca(supino)] },
          { titulo: 'Tudo', itens },
        ],
      });

      expect(resposta.status).toBe(400);
      expect(resposta.body.message).toEqual(['O dia B pode ter no máximo 30 itens.']);
      expect((await obter(c.paula.token, rascunho.id)).body).toEqual(rascunho);
    });

    it('na ficha ativa, remover o último item de um dia ou o último dia responde 400', async () => {
      const ficha = await fichaDaPaula();
      const dias = tresDias();
      dias[1]!.itens = [];

      const semItem = await salvar(c.paula.token, ficha.id, { nome: 'Hipertrofia', dias });
      const semDia = await salvar(c.paula.token, ficha.id, { nome: 'Hipertrofia', dias: [] });

      expect(semItem.status).toBe(400);
      expect(semItem.body.message).toEqual(['Para ativar, o dia B precisa de ao menos um item.']);
      expect(semDia.status).toBe(400);
      expect(semDia.body.message).toEqual(['Para ativar, a ficha precisa de ao menos um dia.']);
      expect((await obter(c.paula.token, ficha.id)).body).toEqual(ficha);
    });

    it('faixa invertida e exercício de outro catálogo respondem 400, sem alterar', async () => {
      const ficha = await fichaDaPaula();

      const faixa = await salvar(c.paula.token, ficha.id, {
        nome: 'X',
        dias: [{ titulo: 'Peito', itens: [forca(supino, { faixaMin: 12, faixaMax: 8 })] }],
      });
      const deOutro = await salvar(c.paula.token, ficha.id, {
        nome: 'X',
        dias: [{ titulo: 'Costas', itens: [forca(remadaDoCaio)] }],
      });

      expect(faixa.status).toBe(400);
      expect(faixa.body.message).toEqual([
        'Dia A, item 1: a faixa mínima não pode ser maior que a máxima.',
      ]);
      expect(deOutro.status).toBe(400);
      expect(deOutro.body.message).toEqual([
        'Exercício não encontrado no seu catálogo ou desativado.',
      ]);
      expect((await obter(c.paula.token, ficha.id)).body).toEqual(ficha);
    });
  });

  describe('POST /fichas/:id/arquivar (FR-010, FR-006, FR-008)', () => {
    it('sem token responde 401', async () => {
      const ficha = await fichaDaPaula();
      expect((await http().post(`/api/fichas/${ficha.id}/arquivar`)).status).toBe(401);
    });

    it('para aluno responde 403, sem arquivar', async () => {
      const ficha = await fichaDaPaula();

      const resposta = await arquivar(c.alunoDaPaula.token, ficha.id);

      expect(resposta.status).toBe(403);
      expect((await obter(c.paula.token, ficha.id)).body.status).toBe('ativa');
    });

    it('ficha de outro professor responde 404, igual a id inexistente, sem arquivar', async () => {
      const ficha = await fichaDaPaula();

      const resposta = await arquivar(c.caio.token, ficha.id);
      const inexistente = await arquivar(c.caio.token, randomUUID());

      expect(resposta.status).toBe(404);
      expect(resposta.body.message).toBe('Ficha não encontrada.');
      expect(inexistente.status).toBe(404);
      expect(inexistente.body).toEqual(resposta.body);
      expect((await obter(c.paula.token, ficha.id)).body.status).toBe('ativa');
    });

    it('arquivar a ativa sem ativar outra deixa o aluno sem ficha, e ela segue legível', async () => {
      const ficha = await fichaDaPaula();

      const resposta = await arquivar(c.paula.token, ficha.id);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        ...ficha,
        status: 'arquivada',
        atualizadaEm: expect.any(String),
      });
      expect((await minhaFicha(c.alunoDaPaula.token)).body).toEqual({ ficha: null });
      expect((await obter(c.paula.token, ficha.id)).body).toEqual(resposta.body);
    });

    it('rascunho também pode ser arquivado', async () => {
      const rascunho = await fichaDaPaula(false);

      const resposta = await arquivar(c.paula.token, rascunho.id);

      expect(resposta.status).toBe(200);
      expect(resposta.body.status).toBe('arquivada');
    });
  });

  describe('ficha arquivada é só leitura (FR-014, FR-006, cenários 2 e 5)', () => {
    it('PUT, ativar e arquivar respondem 409, e a ficha continua legível e igual', async () => {
      const ficha = await fichaDaPaula();
      const arquivada = (await arquivar(c.paula.token, ficha.id)).body as Ficha;

      const aoSalvar = await salvar(c.paula.token, ficha.id, { nome: 'Nova', dias: umDia() });
      const aoAtivar = await ativar(c.paula.token, ficha.id);
      const aoArquivar = await arquivar(c.paula.token, ficha.id);

      for (const resposta of [aoSalvar, aoAtivar, aoArquivar]) {
        expect(resposta.status).toBe(409);
        expect(resposta.body.message).toBe(
          'Ficha arquivada é só leitura. Para reaproveitá-la, duplique.',
        );
      }
      const lida = await obter(c.paula.token, ficha.id);
      expect(lida.status).toBe(200);
      expect(lida.body).toEqual(arquivada);
      expect((await minhaFicha(c.alunoDaPaula.token)).body).toEqual({ ficha: null });
    });

    it('trocar a ativa arquiva a anterior, que segue legível e só leitura (cenário 2)', async () => {
      const anterior = await fichaDaPaula();
      const nova = await criar(c.paula.token, c.alunoDaPaula.id, { nome: 'Nova', dias: umDia() });

      expect((await ativar(c.paula.token, nova.id)).status).toBe(200);

      const lida = await obter(c.paula.token, anterior.id);
      expect(lida.status).toBe(200);
      expect(lida.body).toEqual({
        ...anterior,
        status: 'arquivada',
        atualizadaEm: expect.any(String),
      });
      expect((await ativar(c.paula.token, anterior.id)).status).toBe(409);
      expect((await arquivar(c.paula.token, anterior.id)).status).toBe(409);
      expect((await minhaFicha(c.alunoDaPaula.token)).body.ficha.id).toBe(nova.id);
    });
  });

  describe('POST /fichas/:id/duplicar (FR-010, FR-007, cenário 3)', () => {
    it('sem token responde 401', async () => {
      const ficha = await fichaDaPaula();
      const resposta = await http()
        .post(`/api/fichas/${ficha.id}/duplicar`)
        .send({ alunoId: c.alunoDaPaula.id });
      expect(resposta.status).toBe(401);
    });

    it('para aluno responde 403, e nada é criado', async () => {
      const ficha = await fichaDaPaula();

      const resposta = await duplicar(c.alunoDaPaula.token, ficha.id, {
        alunoId: c.alunoDaPaula.id,
      });

      expect(resposta.status).toBe(403);
      expect(await prisma.plan.count()).toBe(1);
    });

    it('ficha de outro professor (igual a id inexistente) ou aluno de destino de outro professor respondem 404', async () => {
      const ficha = await fichaDaPaula();

      const fichaDeOutro = await duplicar(c.caio.token, ficha.id, { alunoId: c.alunoDoCaio.id });
      const fichaInexistente = await duplicar(c.caio.token, randomUUID(), {
        alunoId: c.alunoDoCaio.id,
      });
      const alunoDeOutro = await duplicar(c.paula.token, ficha.id, { alunoId: c.alunoDoCaio.id });
      const alunoInexistente = await duplicar(c.paula.token, ficha.id, { alunoId: randomUUID() });

      expect(fichaDeOutro.status).toBe(404);
      expect(fichaDeOutro.body.message).toBe('Ficha não encontrada.');
      expect(fichaInexistente.status).toBe(404);
      expect(fichaInexistente.body).toEqual(fichaDeOutro.body);
      for (const resposta of [alunoDeOutro, alunoInexistente]) {
        expect(resposta.status).toBe(404);
        expect(resposta.body.message).toBe('Aluno não encontrado.');
      }
      expect(await prisma.plan.count()).toBe(1);
    });

    it('sem aluno de destino, ou com id inválido, responde 400', async () => {
      const ficha = await fichaDaPaula();

      expect((await duplicar(c.paula.token, ficha.id, {})).status).toBe(400);
      expect((await duplicar(c.paula.token, ficha.id, { alunoId: 'ari' })).status).toBe(400);
      expect(await prisma.plan.count()).toBe(1);
    });

    it('para outro aluno: ficha nova em rascunho, com os mesmos dias e itens, e independente', async () => {
      const original = await fichaDaPaula();

      const resposta = await duplicar(c.paula.token, original.id, {
        alunoId: c.alunoProvisorio.id,
      });

      expect(resposta.status).toBe(201);
      const copia = resposta.body as Ficha;
      expect(copia.id).not.toBe(original.id);
      expect(copia).toMatchObject({
        alunoId: c.alunoProvisorio.id,
        nome: original.nome,
        status: 'rascunho',
      });
      expect(copia.dias).toEqual(original.dias);

      // Editar a cópia não altera a original.
      const editada = await salvar(c.paula.token, copia.id, { nome: 'Da Duda', dias: umDia() });
      expect(editada.status).toBe(200);
      expect((await obter(c.paula.token, original.id)).body).toEqual(original);
    });

    it('para o mesmo aluno: nasce rascunho e a original continua ativa', async () => {
      const original = await fichaDaPaula();

      const resposta = await duplicar(c.paula.token, original.id, { alunoId: c.alunoDaPaula.id });

      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({ alunoId: c.alunoDaPaula.id, status: 'rascunho' });
      expect(resposta.body.dias).toEqual(original.dias);
      expect((await obter(c.paula.token, original.id)).body).toEqual(original);
      expect((await minhaFicha(c.alunoDaPaula.token)).body.ficha.id).toBe(original.id);
    });

    it('a arquivada pode ser duplicada e a cópia pode ser ativada (FR-014)', async () => {
      const original = await fichaDaPaula();
      await arquivar(c.paula.token, original.id);

      const copia = await duplicar(c.paula.token, original.id, { alunoId: c.alunoDaPaula.id });
      const ativada = await ativar(c.paula.token, copia.body.id);

      expect(copia.status).toBe(201);
      expect(ativada.status).toBe(200);
      expect((await minhaFicha(c.alunoDaPaula.token)).body.ficha.id).toBe(copia.body.id);
      expect((await obter(c.paula.token, original.id)).body.status).toBe('arquivada');
    });
  });

  describe('exercício desativado durante o salvamento (FR-011)', () => {
    /**
     * Uma desativação ainda aberta (transação não confirmada) e um salvamento que escolhe o
     * mesmo exercício: o salvamento espera a desativação e é recusado. Sem a trava, ele leria
     * o exercício ainda ativo e gravaria uma escolha nova de exercício desativado.
     */
    const comDesativacaoAberta = async (salvamento: () => Promise<request.Response>) => {
      let desativou!: () => void;
      let confirmar!: () => void;
      const desativado = new Promise<void>((resolver) => (desativou = resolver));
      const liberado = new Promise<void>((resolver) => (confirmar = resolver));
      const desativacao = prisma.$transaction(
        async (tx) => {
          await tx.exercise.update({ where: { id: agachamento }, data: { active: false } });
          desativou();
          await liberado;
        },
        { timeout: 20_000 },
      );
      await desativado;
      const resposta = salvamento();
      await new Promise((resolver) => setTimeout(resolver, 500));
      confirmar();
      await desativacao;
      return resposta;
    };

    it('PUT com o exercício recém-desativado é recusado', async () => {
      const ficha = await criar(c.paula.token, c.alunoDaPaula.id, {
        nome: 'Só supino',
        ativar: true,
        dias: umDia(),
      });

      const resposta = await comDesativacaoAberta(() =>
        salvar(c.paula.token, ficha.id, {
          nome: 'Com agachamento',
          dias: [{ titulo: 'Pernas', itens: [forca(agachamento)] }],
        }).then((r) => r),
      );

      expect(resposta.status).toBe(400);
      expect((await obter(c.paula.token, ficha.id)).body).toEqual(ficha);
    });

    it('criar ficha com o exercício recém-desativado é recusado', async () => {
      const resposta = await comDesativacaoAberta(() =>
        http()
          .post(`/api/alunos/${c.alunoDaPaula.id}/fichas`)
          .set(comToken(c.paula.token))
          .send({ nome: 'Pernas', dias: [{ titulo: 'Pernas', itens: [forca(agachamento)] }] })
          .then((r) => r),
      );

      expect(resposta.status).toBe(400);
      expect(await prisma.plan.count()).toBe(0);
    });
  });
});
