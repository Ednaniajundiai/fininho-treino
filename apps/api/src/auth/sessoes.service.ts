import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Prisma, User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  decidirRotacao,
  gerarTokenRenovacao,
  hashDoToken,
  type PayloadDoAcesso,
  RENOVACAO_TTL_MS,
} from './tokens.js';

export type Sessao = {
  accessToken: string;
  /** Valor do token de renovação: vai só para o cookie, nunca para o corpo da resposta. */
  refreshToken: string;
  /** Família do token: identifica o login (o aparelho) a que a sessão pertence. */
  familyId: string;
  usuario: User;
};

/**
 * Sessões de acesso (contrato autenticacao/C-03): token de acesso curto e token de renovação
 * que gira a cada uso. As renovações de um mesmo login formam uma família.
 */
@Injectable()
export class SessoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Novo login: nova família. */
  abrir(usuario: User): Promise<Sessao> {
    return this.emitir(usuario, randomUUID());
  }

  /**
   * Gira o token: o apresentado deixa de valer e outro é emitido na mesma família.
   * Token já usado que reaparece indica roubo: a família inteira é revogada.
   */
  async renovar(valor: string): Promise<Sessao> {
    const agora = new Date();
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashDoToken(valor) },
    });

    let decisao = decidirRotacao(token, agora);
    if (token && decisao === 'VALIDO') {
      // Marca como usado só se ainda não foi: duas renovações simultâneas do mesmo token não
      // passam as duas. Quem perde a corrida é tratado como reuso.
      const { count } = await this.prisma.refreshToken.updateMany({
        where: { id: token.id, usedAt: null, revokedAt: null },
        data: { usedAt: agora },
      });
      if (count === 0) decisao = 'REUSO';
    }
    if (token && decisao === 'REUSO') await this.revogarFamilia(token.familyId);
    if (!token || decisao !== 'VALIDO') throw new UnauthorizedException('Não autenticado.');

    const usuario = await this.prisma.user.findUniqueOrThrow({ where: { id: token.userId } });
    return this.emitir(usuario, token.familyId);
  }

  /** Logout: encerra o login do aparelho que apresentou o token. Token desconhecido: nada a fazer. */
  async encerrar(valor: string): Promise<void> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashDoToken(valor) },
    });
    if (token) await this.revogarFamilia(token.familyId);
  }

  /**
   * Derruba as sessões de uma conta (troca ou redefinição de senha). `excetoFamilia` preserva o
   * login de quem está fazendo a troca. Aceita o cliente de uma transação em curso.
   */
  async revogarDoUsuario(
    userId: string,
    opcoes: { excetoFamilia?: string; tx?: Prisma.TransactionClient } = {},
  ): Promise<void> {
    await (opcoes.tx ?? this.prisma).refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(opcoes.excetoFamilia ? { familyId: { not: opcoes.excetoFamilia } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  private async revogarFamilia(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async emitir(usuario: User, familyId: string): Promise<Sessao> {
    const renovacao = gerarTokenRenovacao();
    await this.prisma.refreshToken.create({
      data: {
        userId: usuario.id,
        familyId,
        tokenHash: renovacao.hash,
        expiresAt: new Date(Date.now() + RENOVACAO_TTL_MS),
      },
    });
    const payload: PayloadDoAcesso = {
      sub: usuario.id,
      role: usuario.role,
      mcp: usuario.mustChangePassword,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      refreshToken: renovacao.valor,
      familyId,
      usuario,
    };
  }
}
