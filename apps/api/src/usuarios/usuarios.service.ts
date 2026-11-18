import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { SessoesService } from '../auth/sessoes.service.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { normalizarEmail } from './email.js';
import { gerarHashDaSenha, motivoSenhaInvalida } from './senha.js';

export type DadosDoProfessor = {
  nome: string;
  email: string;
  senha: string;
  /** Confirmação explícita para trocar a senha de um professor que já existe. */
  redefinir?: boolean;
};

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessoes: SessoesService,
  ) {}

  /**
   * Usado só pelo comando administrativo (src/cli), nunca por rota da API: é assim que o
   * primeiro professor nasce (contrato autenticacao/C-01). A senha é definitiva.
   */
  async criarProfessor(
    dados: DadosDoProfessor,
  ): Promise<{ acao: 'criado' | 'senha-redefinida'; usuario: User }> {
    const motivo = motivoSenhaInvalida(dados.senha);
    if (motivo) throw new BadRequestException(motivo);

    const email = normalizarEmail(dados.email);
    const existente = await this.prisma.user.findUnique({ where: { email } });

    if (!existente) {
      const usuario = await this.prisma.user.create({
        data: {
          name: dados.nome.trim(),
          email,
          passwordHash: await gerarHashDaSenha(dados.senha),
          role: 'PROFESSOR',
        },
      });
      return { acao: 'criado', usuario };
    }

    if (existente.role !== 'PROFESSOR') {
      throw new ConflictException(
        'Este e-mail pertence a um aluno. Quem redefine a senha do aluno é o professor dele.',
      );
    }
    if (!dados.redefinir) {
      throw new ConflictException(
        'Já existe um professor com este e-mail. Para trocar a senha dele, confirme a redefinição.',
      );
    }

    const passwordHash = await gerarHashDaSenha(dados.senha);
    const usuario = await this.prisma.$transaction(async (tx) => {
      await this.sessoes.revogarDoUsuario(existente.id, { tx });
      return tx.user.update({
        where: { id: existente.id },
        data: { passwordHash, mustChangePassword: false },
      });
    });
    return { acao: 'senha-redefinida', usuario };
  }
}
