import argon2 from 'argon2';

export const SENHA_MIN = 8;
export const SENHA_MAX = 128;

/** Devolve o motivo da recusa, ou null se a senha cumpre a política. */
export function motivoSenhaInvalida(senha: string): string | null {
  if (senha.length < SENHA_MIN) return `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`;
  if (senha.length > SENHA_MAX) return `A senha pode ter no máximo ${SENHA_MAX} caracteres.`;
  return null;
}

export function gerarHashDaSenha(senha: string): Promise<string> {
  return argon2.hash(senha, { type: argon2.argon2id });
}

export function senhaConfere(hash: string, senha: string): Promise<boolean> {
  return argon2.verify(hash, senha);
}
