import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { gerarHashDaSenha, motivoSenhaInvalida, senhaConfere } from '../usuarios/senha.js';
import { type Sessao, SessoesService } from './sessoes.service.js';

@Injectable()
export class AuthService {
  // Hash de uma senha que ninguém tem, calculado uma vez. Login com e-mail inexistente confere
  // a senha contra ele, para gastar o mesmo tempo de um e-mail que existe: assim o tempo de
  // resposta não revela se o e-mail está cadastrado.
  private readonly hashDeEqualizacao = gerarHashDaSenha(crypto.randomUUID());

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessoes: SessoesService,
  ) {}

  /** `email` chega já normalizado pelo LoginDto. */
  async entrar(email: string, senha: string): Promise<Sessao> {
    const usuario = await this.prisma.user.findUnique({ where: { email } });
    const confere = await senhaConfere(
      usuario?.passwordHash ?? (await this.hashDeEqualizacao),
      senha,
    );
    // Mesma resposta para e-mail inexistente e senha errada (contrato autenticacao/C-03).
    if (!usuario || !confere) throw new UnauthorizedException('E-mail ou senha inválidos.');
    return this.sessoes.abrir(usuario);
  }

  /**
   * Troca de senha (obrigatória para quem está com a provisória). A senha vira definitiva,
   * todas as sessões da conta caem e uma sessão nova é aberta para quem trocou: assim os outros
   * aparelhos saem, e o token de acesso novo já não carrega a marca de senha provisória.
   */
  async trocarSenha(usuarioId: string, senhaAtual: string, novaSenha: string): Promise<Sessao> {
    const usuario = await this.minhaConta(usuarioId);
    if (!(await senhaConfere(usuario.passwordHash, senhaAtual))) {
      throw new BadRequestException('Senha atual incorreta.');
    }
    const motivo = motivoSenhaInvalida(novaSenha);
    if (motivo) throw new BadRequestException(motivo);
    if (novaSenha === senhaAtual) {
      throw new BadRequestException('A nova senha precisa ser diferente da atual.');
    }

    const passwordHash = await gerarHashDaSenha(novaSenha);
    const atualizado = await this.prisma.$transaction(async (tx) => {
      await this.sessoes.revogarDoUsuario(usuario.id, { tx });
      return tx.user.update({
        where: { id: usuario.id },
        data: { passwordHash, mustChangePassword: false },
      });
    });
    return this.sessoes.abrir(atualizado);
  }

  async minhaConta(id: string): Promise<User> {
    const usuario = await this.prisma.user.findUnique({ where: { id } });
    // Token válido de conta que não existe mais.
    if (!usuario) throw new UnauthorizedException('Não autenticado.');
    return usuario;
  }
}
