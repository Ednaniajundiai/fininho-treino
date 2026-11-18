import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExerciciosService } from '../exercicios/exercicios.service.js';
import { unidadeParaOBanco } from '../exercicios/unidade.js';
import type { Plan, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
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
    private readonly exercicios: ExerciciosService,
  ) {}

  /** Cria como rascunho ou já ativa; já ativa arquiva a ativa anterior do aluno (FR-006). */
  async criar(professorId: string, alunoId: string, dados: DadosDaFicha): Promise<FichaCompleta> {
    await this.usuarios.alunoDoProfessor(professorId, alunoId);
    const ativa = dados.ativar === true;
    recusarSeInvalida(dados.dias, ativa);
    await this.recusarExerciciosIndisponiveis(professorId, dados.dias);

    return this.prisma.$transaction(async (tx) => {
      if (ativa) await arquivarAtivaDoAluno(tx, alunoId);
      return tx.plan.create({
        data: {
          studentId: alunoId,
          teacherId: professorId,
          name: dados.nome,
          status: ativa ? 'ACTIVE' : 'DRAFT',
          days: {
            create: numerarDias(dados.dias).map((dia) => ({
              position: dia.ordem,
              title: dia.titulo,
              items: { create: dia.itens.map(paraItemDoBanco) },
            })),
          },
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
   * Arquiva a ativa do aluno e ativa esta, na mesma transação (FR-006, D-03). Ativar a que já
   * está ativa não muda nada.
   */
  async ativar(professorId: string, fichaId: string): Promise<FichaCompleta> {
    const ficha = await this.obter(professorId, fichaId);
    if (ficha.status === 'ACTIVE') return ficha;
    recusarSeInvalida(paraFichaDto(ficha).dias, true);

    return this.prisma.$transaction(async (tx) => {
      await arquivarAtivaDoAluno(tx, ficha.studentId);
      return tx.plan.update({
        where: { id: ficha.id },
        data: { status: 'ACTIVE' },
        include: FICHA_COMPLETA,
      });
    });
  }

  /** Item de força só aceita exercício ativo do catálogo do próprio professor (FR-011, C-02). */
  private async recusarExerciciosIndisponiveis(
    professorId: string,
    dias: DiaEntrada[],
  ): Promise<void> {
    const pedidos = [
      ...new Set(
        dias.flatMap((dia) =>
          dia.itens.flatMap((item) => (item.exercicioId ? [item.exercicioId] : [])),
        ),
      ),
    ];
    const disponiveis = await this.exercicios.idsAtivosDoProfessor(professorId, pedidos);
    if (pedidos.some((id) => !disponiveis.has(id))) {
      throw new BadRequestException(['Exercício não encontrado no seu catálogo ou desativado.']);
    }
  }
}

function recusarSeInvalida(dias: DiaEntrada[], ativa: boolean): void {
  const motivos = motivosDeRecusa(dias, { ativa });
  if (motivos.length > 0) throw new BadRequestException(motivos);
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
