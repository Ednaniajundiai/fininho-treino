import type { CookieOptions } from 'express';
import { RENOVACAO_TTL_MS } from './tokens.js';

export const COOKIE_DE_RENOVACAO = 'ft_refresh';

/**
 * Contrato autenticacao/C-03: o token de renovação só existe neste cookie. httpOnly (o
 * JavaScript da página não lê), Secure, SameSite=Strict (não viaja em requisição vinda de outro
 * site) e restrito às rotas de autenticação, que são as únicas que o leem: renovar e sair.
 */
export const OPCOES_DO_COOKIE: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/api/auth',
};

export const OPCOES_AO_GRAVAR: CookieOptions = { ...OPCOES_DO_COOKIE, maxAge: RENOVACAO_TTL_MS };
