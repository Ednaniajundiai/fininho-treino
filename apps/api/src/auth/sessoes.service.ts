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
    return this.emitir(usuario, randomUUID(), this.prisma);
  }

  /**
   * Gira o token: o apresentado deixa de valer e outro é emitido na mesma família.
   * Token já usado que reaparece indica roubo: a família inteira é revogada.
   *
   * Tudo numa transação só. Se o mesmo token chega duas vezes ao mesmo tempo, o UPDATE da
   * segunda espera a primeira confirmar, não altera nenhuma linha (já foi usado) e vira reuso;
   * a essa altura o token novo da primeira já está gravado e é revogado junto com a família.
   */
  async renovar(valor: string): Promise<Sessao> {
    const agora = new Date();
    const sessao = await this.prisma.$transaction(async (tx) => {
      const token = await tx.refreshToken.findUnique({
        where: { tokenHash: hashDoToken(valor) },
      });
      if (!token) return null;

      let decisao = decidirRotacao(token, agora);
      if (decisao === 'VALIDO') {
        const { count } = await tx.refreshToken.updateMany({
          where: { id: token.id, usedAt: null, revokedAt: null },
          data: { usedAt: agora },
        });
        if (count === 0) decisao = 'REUSO';
      }
      if (decisao === 'REUSO') await this.revogarFamilia(token.familyId, tx);
      // Sem lançar aqui dentro: a revogação precisa ser confirmada junto com a transação.
      if (decisao !== 'VALIDO') return null;

      const usuario = await tx.user.findUniqueOrThrow({ where: { id: token.userId } });
      return this.emitir(usuario, token.familyId, tx);
    });

    if (!sessao) throw new UnauthorizedException('Não autenticado.');
    return sessao;
  }

  /** Logout: encerra o login do aparelho que apresentou o token. Token desconhecido: nada a fazer. */
  async encerrar(valor: string): Promise<void> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashDoToken(valor) },
    });
    if (token) await this.revogarFamilia(token.familyId, this.prisma);
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

  private async revogarFamilia(familyId: string, db: Prisma.TransactionClient): Promise<void> {
    await db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async emitir(
    usuario: User,
    familyId: string,
    db: Prisma.TransactionClient,
  ): Promise<Sessao> {
    const renovacao = gerarTokenRenovacao();
    await db.refreshToken.create({
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
