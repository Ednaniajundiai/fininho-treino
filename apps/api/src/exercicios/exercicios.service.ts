import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Exercise, Prisma } from '../generated/prisma/client.js';
import type { Unidade } from '../fichas/ficha-validation.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { unidadeParaOBanco } from './unidade.js';

/** Catálogo de exercícios (contrato fichas/C-02): cada professor só enxerga o dele. */
@Injectable()
export class ExerciciosService {
  constructor(private readonly prisma: PrismaService) {}

  listar(professorId: string): Promise<Exercise[]> {
    return this.prisma.exercise.findMany({
      where: { teacherId: professorId },
      orderBy: { name: 'asc' },
    });
  }

  async criar(
    professorId: string,
    dados: { nome: string; unidadePadrao: Unidade },
  ): Promise<Exercise> {
    return recusarNomeRepetido(() =>
      this.prisma.exercise.create({
        data: {
          teacherId: professorId,
          name: dados.nome,
          defaultUnit: unidadeParaOBanco(dados.unidadePadrao),
        },
      }),
    );
  }

  /**
   * Renomeia, muda a unidade padrão ou desativa/reativa (FR-011). Nunca apaga: o desativado
   * some das novas escolhas e continua nas fichas que já o usam.
   */
  async atualizar(
    professorId: string,
    id: string,
    dados: { nome?: string; unidadePadrao?: Unidade; ativo?: boolean },
  ): Promise<Exercise> {
    const doProfessor = await this.prisma.exercise.findFirst({
      where: { id, teacherId: professorId },
      select: { id: true },
    });
    if (!doProfessor) throw new NotFoundException('Exercício não encontrado.');
    return recusarNomeRepetido(() =>
      this.prisma.exercise.update({
        where: { id },
        data: {
          name: dados.nome,
          defaultUnit: dados.unidadePadrao && unidadeParaOBanco(dados.unidadePadrao),
          active: dados.ativo,
        },
      }),
    );
  }
}

/**
 * A unicidade sem caixa é do banco (índice único em lower(name)), inclusive em corrida; aqui
 * só vira a resposta 409.
 */
async function recusarNomeRepetido(gravar: () => Promise<Exercise>): Promise<Exercise> {
  try {
    return await gravar();
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
      throw new ConflictException('Já existe um exercício com este nome no seu catálogo.');
    }
    throw erro;
  }
}

/**
 * Os ids que são exercícios ativos do catálogo deste professor, travados (FOR SHARE) até o fim
 * da transação de quem monta a ficha (FR-011, C-02). A trava ordena a gravação da ficha e a
 * desativação do exercício: quem desativa espera a ficha terminar, e a ficha que chega depois
 * da desativação já o vê desativado e o recusa.
 */
export async function travarExerciciosAtivos(
  tx: Prisma.TransactionClient,
  professorId: string,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const encontrados = await tx.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM exercises
    WHERE id = ANY(${ids}::uuid[]) AND teacher_id = ${professorId}::uuid AND active
    FOR SHARE`;
  return new Set(encontrados.map((exercicio) => exercicio.id));
}
