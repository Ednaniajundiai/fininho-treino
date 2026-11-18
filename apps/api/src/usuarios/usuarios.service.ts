import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import { SessoesService } from '../auth/sessoes.service.js';
import { Prisma, type User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { normalizarEmail } from './email.js';
import { gerarHashDaSenha, motivoSenhaInvalida } from './senha.js';
import { gerarSenhaProvisoria } from './senha-provisoria.js';

export type DadosDoProfessor = {
  nome: string;
  email: string;
  senha: string;
  /** Confirmação explícita para trocar a senha de um professor que já existe. */
  redefinir?: boolean;
};

/** O aluno e a senha provisória em texto: o único momento em que ela existe fora do hash. */
export type AlunoComSenhaProvisoria = { usuario: User; senhaProvisoria: string };

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
    // O comando lê do terminal: aqui é a borda, então a validação que a API faz no DTO é feita
    // aqui para o professor.
    const nome = dados.nome.trim();
    const email = normalizarEmail(dados.email);
    if (nome.length < 2) throw new BadRequestException('Informe o nome do professor.');
    if (!isEmail(email)) throw new BadRequestException('E-mail inválido.');
    const motivo = motivoSenhaInvalida(dados.senha);
    if (motivo) throw new BadRequestException(motivo);

    const existente = await this.prisma.user.findUnique({ where: { email } });

    if (!existente) {
      const usuario = await this.prisma.user.create({
        data: {
          name: nome,
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

  /**
   * `dados` chega validado e normalizado pelo CriarAlunoDto. O aluno fica vinculado ao
   * professor que o criou, com uma senha provisória gerada aqui (contrato autenticacao/C-02).
   */
  async criarAluno(
    professorId: string,
    dados: { nome: string; email: string },
  ): Promise<AlunoComSenhaProvisoria> {
    const senhaProvisoria = gerarSenhaProvisoria();
    try {
      const usuario = await this.prisma.user.create({
        data: {
          name: dados.nome,
          email: dados.email,
          passwordHash: await gerarHashDaSenha(senhaProvisoria),
          role: 'ALUNO',
          mustChangePassword: true,
          teacherId: professorId,
        },
      });
      return { usuario, senhaProvisoria };
    } catch (erro) {
      // A unicidade do e-mail é do banco (índice único): vale também para criações simultâneas.
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('E-mail já cadastrado.');
      }
      throw erro;
    }
  }

  listarAlunos(professorId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { teacherId: professorId },
      orderBy: { name: 'asc' },
    });
  }

  /** Nova provisória para quem esqueceu a senha: a anterior deixa de valer e as sessões caem. */
  async redefinirSenhaAluno(
    professorId: string,
    alunoId: string,
  ): Promise<AlunoComSenhaProvisoria> {
    const aluno = await this.alunoDoProfessor(professorId, alunoId);
    const senhaProvisoria = gerarSenhaProvisoria();
    const passwordHash = await gerarHashDaSenha(senhaProvisoria);
    const usuario = await this.prisma.$transaction(async (tx) => {
      await this.sessoes.revogarDoUsuario(aluno.id, { tx });
      return tx.user.update({
        where: { id: aluno.id },
        data: { passwordHash, mustChangePassword: true },
      });
    });
    return { usuario, senhaProvisoria };
  }

  /**
   * Checagem de posse (princípio I): o aluno só existe para o professor dele. Aluno de outro
   * professor responde o mesmo "não encontrado" de um id inexistente, para não revelar que existe.
   */
  private async alunoDoProfessor(professorId: string, alunoId: string): Promise<User> {
    const aluno = await this.prisma.user.findFirst({
      where: { id: alunoId, teacherId: professorId },
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado.');
    return aluno;
  }
}
