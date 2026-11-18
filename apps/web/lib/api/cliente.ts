import createClient, { type Middleware } from 'openapi-fetch';
import type { components, paths } from './schema';

export type Conta = components['schemas']['ContaDto'];
export type Sessao = components['schemas']['SessaoDto'];

/**
 * O token de acesso vive só aqui, em memória (contrato autenticacao/C-03): some ao recarregar a
 * página e é recuperado pela renovação, que usa o cookie httpOnly que o JavaScript não lê.
 */
let accessToken: string | null = null;
const ouvintes = new Set<(sessao: Sessao | null) => void>();

/** Avisa a tela (lib/sessao.tsx) sempre que a sessão muda por renovação ou cai. */
export function aoMudarSessao(ouvinte: (sessao: Sessao | null) => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function definirSessao(sessao: Sessao | null): void {
  accessToken = sessao?.accessToken ?? null;
  ouvintes.forEach((ouvinte) => ouvinte(sessao));
}

let renovacaoEmCurso: Promise<Sessao | null> | null = null;

/**
 * Uma renovação por vez por aba: o token de renovação gira a cada uso, então duas chamadas
 * simultâneas com o mesmo cookie seriam lidas pela API como reuso e derrubariam a sessão.
 */
export function renovarSessao(): Promise<Sessao | null> {
  renovacaoEmCurso ??= fetch('/api/auth/refresh', { method: 'POST' })
    .then(async (resposta) => (resposta.ok ? ((await resposta.json()) as Sessao) : null))
    .catch(() => null)
    .then((sessao) => {
      definirSessao(sessao);
      return sessao;
    })
    .finally(() => {
      renovacaoEmCurso = null;
    });
  return renovacaoEmCurso;
}

// Login, renovação e logout não se repetem: neles o 401 é a resposta final.
const SEM_REPETICAO = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];
// Cópia de cada requisição ainda com o corpo intacto, para poder repeti-la depois de renovar.
const copias = new Map<string, Request>();

const autenticacao: Middleware = {
  onRequest({ request, id }) {
    if (accessToken) request.headers.set('Authorization', `Bearer ${accessToken}`);
    if (!SEM_REPETICAO.includes(new URL(request.url).pathname)) copias.set(id, request.clone());
    return request;
  },
  // Token de acesso vencido (15 min): renova uma vez e repete a mesma requisição.
  async onResponse({ response, id }) {
    const copia = copias.get(id);
    copias.delete(id);
    if (response.status !== 401 || !copia) return response;

    const sessao = await renovarSessao();
    if (!sessao) return response;
    copia.headers.set('Authorization', `Bearer ${sessao.accessToken}`);
    return fetch(copia);
  },
  onError({ id }) {
    copias.delete(id);
  },
};

export const api = createClient<paths>({ baseUrl: '/' });
api.use(autenticacao);

/** Mensagem de erro da API (campo `message`), ou um texto padrão. */
export function mensagemDeErro(erro: unknown, padrao: string): string {
  if (erro && typeof erro === 'object' && 'message' in erro) {
    const { message } = erro as { message: unknown };
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  }
  return padrao;
}
