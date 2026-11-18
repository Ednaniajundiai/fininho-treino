import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { gerarHashDaSenha, senhaConfere } from '../usuarios/senha.js';
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

  async minhaConta(id: string): Promise<User> {
    const usuario = await this.prisma.user.findUnique({ where: { id } });
    // Token válido de conta que não existe mais.
    if (!usuario) throw new UnauthorizedException('Não autenticado.');
    return usuario;
  }
}
