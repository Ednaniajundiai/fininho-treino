import { ConflictException, Injectable } from '@nestjs/common';
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
    try {
      return await this.prisma.exercise.create({
        data: {
          teacherId: professorId,
          name: dados.nome,
          defaultUnit: unidadeParaOBanco(dados.unidadePadrao),
        },
      });
    } catch (erro) {
      // A unicidade sem caixa é do banco (índice único em lower(name)), inclusive em corrida.
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Já existe um exercício com este nome no seu catálogo.');
      }
      throw erro;
    }
  }

  /**
   * Os ids que são exercícios ativos do catálogo deste professor. Quem monta a ficha usa para
   * recusar exercício desativado ou de outro catálogo (FR-011, C-02).
   */
  async idsAtivosDoProfessor(professorId: string, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const encontrados = await this.prisma.exercise.findMany({
      where: { id: { in: ids }, teacherId: professorId, active: true },
      select: { id: true },
    });
    return new Set(encontrados.map((exercicio) => exercicio.id));
  }
}
