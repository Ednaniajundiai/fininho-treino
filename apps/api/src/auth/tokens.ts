import { createHash, randomBytes } from 'node:crypto';
import type { Role } from '../generated/prisma/client.js';

/** Conteúdo do token de acesso (JWT). `mcp`: a conta está com senha provisória. */
export type PayloadDoAcesso = {
  sub: string;
  role: Role;
  mcp: boolean;
};

export const ACESSO_TTL_SEGUNDOS = 15 * 60;
export const RENOVACAO_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** O valor vai só para o cookie; o banco guarda só o hash. */
export function gerarTokenRenovacao(): { valor: string; hash: string } {
  const valor = randomBytes(32).toString('base64url');
  return { valor, hash: hashDoToken(valor) };
}

// SHA-256 basta: o valor tem 256 bits de entropia, não é senha escolhida por pessoa.
export function hashDoToken(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}

export type EstadoDoToken = {
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
};

export type DecisaoDaRotacao = 'VALIDO' | 'INVALIDO' | 'REUSO';

/**
 * Token já usado que reaparece é sinal de roubo: quem chama revoga a família inteira.
 * Por isso REUSO tem precedência sobre vencido e revogado.
 */
export function decidirRotacao(token: EstadoDoToken | null, agora: Date): DecisaoDaRotacao {
  if (!token) return 'INVALIDO';
  if (token.usedAt) return 'REUSO';
  if (token.revokedAt || token.expiresAt <= agora) return 'INVALIDO';
  return 'VALIDO';
}
