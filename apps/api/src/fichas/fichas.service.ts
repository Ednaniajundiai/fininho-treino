import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { travarExerciciosAtivos } from '../exercicios/exercicios.service.js';
import { unidadeParaOBanco } from '../exercicios/unidade.js';
import type { Plan, PlanStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { copiaDosDias } from './duplicacao.js';
import { FICHA_COMPLETA, type FichaCompleta, paraFichaDto } from './dto/ficha.dto.js';
import {
  type DiaEntrada,
  type ItemEntrada,
  motivosDeRecusa,
  numerarDias,
} from './ficha-validation.js';
import { modalidadeParaOBanco, tipoParaOBanco } from './valores.js';

export type DadosDaFicha = { nome: string; ativar?: boolean; dias: DiaEntrada[] };

/**
 * Fichas de treino (contrato fichas/C-01). Toda operação recebe o id do professor logado e
 * checa a posse aqui (princípio I): ficha ou aluno de outro professor é "não encontrado".
 */
@Injectable()
export class FichasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usuarios: UsuariosService,
  ) {}

  /** Cria como rascunho ou já ativa; já ativa arquiva a ativa anterior do aluno (FR-006). */
  async criar(professorId: string, alunoId: string, dados: DadosDaFicha): Promise<FichaCompleta> {
    await this.usuarios.alunoDoProfessor(professorId, alunoId);
    const ativa = dados.ativar === true;
    recusarSeInvalida(dados.dias, ativa);

    return this.prisma.$transaction(async (tx) => {
      await recusarExerciciosIndisponiveis(tx, professorId, exerciciosPedidos(dados.dias));
      if (ativa) await arquivarAtivaDoAluno(tx, alunoId);
      return tx.plan.create({
        data: {
          studentId: alunoId,
          teacherId: professorId,
          name: dados.nome,
          status: ativa ? 'ACTIVE' : 'DRAFT',
          days: { create: paraDiasDoBanco(dados.dias) },
        },
        include: FICHA_COMPLETA,
      });
    });
  }

  /** Rascunhos, ativa e arquivadas do aluno, a mais nova primeiro. */
  async listarPorAluno(professorId: string, alunoId: string): Promise<Plan[]> {
    await this.usuarios.alunoDoProfessor(professorId, alunoId);
    return this.prisma.plan.findMany({
      where: { studentId: alunoId, teacherId: professorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obter(professorId: string, fichaId: string): Promise<FichaCompleta> {
    const ficha = await this.prisma.plan.findFirst({
      where: { id: fichaId, teacherId: professorId },
      include: FICHA_COMPLETA,
    });
    if (!ficha) throw new NotFoundException('Ficha não encontrada.');
    return ficha;
  }

  /**
   * A ficha ativa do aluno logado (FR-008), ou null. O id vem do token: o aluno só alcança a
   * dele, e rascunho e arquivada nunca saem por aqui. Não filtra por professor porque a ativa
   * é única por aluno (índice parcial) e quem a criou é o professor dele.
   */
  async ativaDoAluno(alunoId: string): Promise<FichaCompleta | null> {
    return this.prisma.plan.findFirst({
      where: { studentId: alunoId, status: 'ACTIVE' },
      include: FICHA_COMPLETA,
    });
  }

  /**
   * Substitui nome, dias e itens numa transação (FR-009, D-02). O status não muda: a ficha
   * ativa segue as regras de ativa (ao menos um dia e um item por dia), o rascunho pode ficar
   * vazio, e a arquivada é recusada (FR-014). Exercício que a ficha já usa continua aceito
   * mesmo desativado; escolha nova só de exercício ativo (FR-011).
   */
  async atualizar(
    professorId: string,
    fichaId: string,
    dados: { nome: string; dias: DiaEntrada[] },
  ): Promise<FichaCompleta> {
    return this.prisma.$transaction(async (tx) => {
      const status = await travarFichaEditavel(tx, professorId, fichaId);
      recusarSeInvalida(dados.dias, status === 'ACTIVE');

      const jaNaFicha = await tx.planItem.findMany({
        where: { day: { planId: fichaId }, exerciseId: { not: null } },
        select: { exerciseId: true },
      });
      const usados = new Set(jaNaFicha.map((item) => item.exerciseId));
      const novos = exerciciosPedidos(dados.dias).filter((id) => !usados.has(id));
      await recusarExerciciosIndisponiveis(tx, professorId, novos);

      await tx.planDay.deleteMany({ where: { planId: fichaId } });
      return tx.plan.update({
        where: { id: fichaId },
        data: { name: dados.nome, days: { create: paraDiasDoBanco(dados.dias) } },
        include: FICHA_COMPLETA,
      });
    });
  }

  /**
   * Arquiva a ativa do aluno e ativa esta, na mesma transação (FR-006, D-03). Ativar a que já
   * está ativa não muda nada; arquivada não volta (FR-014).
   */
  async ativar(professorId: string, fichaId: string): Promise<FichaCompleta> {
    return this.prisma.$transaction(async (tx) => {
      const status = await travarFichaEditavel(tx, professorId, fichaId);
      const ficha = await tx.plan.findUniqueOrThrow({
        where: { id: fichaId },
        include: FICHA_COMPLETA,
      });
      if (status === 'ACTIVE') return ficha;
      recusarSeInvalida(paraFichaDto(ficha).dias, true);

      await arquivarAtivaDoAluno(tx, ficha.studentId);
      return tx.plan.update({
        where: { id: fichaId },
        data: { status: 'ACTIVE' },
        include: FICHA_COMPLETA,
      });
    });
  }

  /** Arquiva a ficha (FR-010). Se era a ativa, o aluno fica sem ficha ativa. */
  async arquivar(professorId: string, fichaId: string): Promise<FichaCompleta> {
    return this.prisma.$transaction(async (tx) => {
      await travarFichaEditavel(tx, professorId, fichaId);
      return tx.plan.update({
        where: { id: fichaId },
        data: { status: 'ARCHIVED' },
        include: FICHA_COMPLETA,
      });
    });
  }

  /**
   * Ficha nova, em rascunho, com os mesmos dias e itens, para um aluno do professor (FR-010).
   * Qualquer ficha dele pode ser duplicada, inclusive a arquivada (FR-014).
   */
  async duplicar(professorId: string, fichaId: string, alunoId: string): Promise<FichaCompleta> {
    const original = await this.obter(professorId, fichaId);
    await this.usuarios.alunoDoProfessor(professorId, alunoId);
    return this.prisma.plan.create({
      data: {
        studentId: alunoId,
        teacherId: professorId,
        name: original.name,
        status: 'DRAFT',
        days: { create: copiaDosDias(original) },
      },
      include: FICHA_COMPLETA,
    });
  }
}

function recusarSeInvalida(dias: DiaEntrada[], ativa: boolean): void {
  const motivos = motivosDeRecusa(dias, { ativa });
  if (motivos.length > 0) throw new BadRequestException(motivos);
}

/**
 * Trava a ficha até o fim da transação e devolve o status lido depois da trava: edição,
 * ativação e arquivamento da mesma ficha passam uma de cada vez, e quem chega depois de um
 * arquivamento vê a ficha já arquivada (409).
 */
async function travarFichaEditavel(
  tx: Prisma.TransactionClient,
  professorId: string,
  fichaId: string,
): Promise<PlanStatus> {
  const [ficha] = await tx.$queryRaw<{ status: PlanStatus }[]>`
    SELECT status::text AS status FROM plans
    WHERE id = ${fichaId}::uuid AND teacher_id = ${professorId}::uuid
    FOR UPDATE`;
  if (!ficha) throw new NotFoundException('Ficha não encontrada.');
  if (ficha.status === 'ARCHIVED') {
    throw new ConflictException('Ficha arquivada é só leitura. Para reaproveitá-la, duplique.');
  }
  return ficha.status;
}

function exerciciosPedidos(dias: DiaEntrada[]): string[] {
  return [
    ...new Set(
      dias.flatMap((dia) =>
        dia.itens.flatMap((item) => (item.exercicioId ? [item.exercicioId] : [])),
      ),
    ),
  ];
}

/**
 * Item de força só aceita exercício ativo do catálogo do próprio professor (FR-011, C-02).
 * Roda dentro da transação que grava a ficha, com os exercícios travados até o fim dela.
 */
async function recusarExerciciosIndisponiveis(
  tx: Prisma.TransactionClient,
  professorId: string,
  pedidos: string[],
): Promise<void> {
  const disponiveis = await travarExerciciosAtivos(tx, professorId, pedidos);
  if (pedidos.some((id) => !disponiveis.has(id))) {
    throw new BadRequestException(['Exercício não encontrado no seu catálogo ou desativado.']);
  }
}

/**
 * Trava a linha do aluno até o fim da transação: ativações simultâneas para o mesmo aluno
 * passam uma de cada vez e a última vence, sem erro. O índice único parcial continua sendo a
 * garantia final de uma ativa por aluno.
 */
async function arquivarAtivaDoAluno(tx: Prisma.TransactionClient, alunoId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${alunoId}::uuid FOR UPDATE`;
  await tx.plan.updateMany({
    where: { studentId: alunoId, status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  });
}

/** Dias na ordem recebida: é ela que define a rotação e o rótulo (FR-012, C-03). */
function paraDiasDoBanco(dias: DiaEntrada[]): Prisma.PlanDayCreateWithoutPlanInput[] {
  return numerarDias(dias).map((dia) => ({
    position: dia.ordem,
    title: dia.titulo,
    items: { create: dia.itens.map(paraItemDoBanco) },
  }));
}

/** Só os campos do tipo do item vão para o banco (o CHECK por tipo recusaria os outros). */
function paraItemDoBanco(
  item: ItemEntrada & { ordem: number },
): Prisma.PlanItemCreateWithoutDayInput {
  const comum = {
    position: item.ordem,
    type: tipoParaOBanco(item.tipo),
    notes: item.observacao ? item.observacao : null,
  };
  if (item.tipo === 'forca') {
    return {
      ...comum,
      exercise: { connect: { id: item.exercicioId } },
      sets: item.series,
      rangeMin: item.faixaMin,
      rangeMax: item.faixaMax,
      unit: item.unidade ? unidadeParaOBanco(item.unidade) : null,
    };
  }
  return {
    ...comum,
    cardioMode: item.modalidade ? modalidadeParaOBanco(item.modalidade) : null,
    minutesMin: item.duracaoMinMin,
    minutesMax: item.duracaoMaxMin,
  };
}
