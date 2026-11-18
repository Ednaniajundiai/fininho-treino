import { randomInt } from 'node:crypto';

// Sem os caracteres que se confundem ao ditar ou copiar: 0/o, 1/l/i.
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';
const GRUPOS = 3;
const TAMANHO_DO_GRUPO = 4;

/**
 * Senha provisória do aluno (contrato autenticacao/C-02): gerada pelo sistema, mostrada ao
 * professor uma única vez. 12 caracteres de um alfabeto de 31 (cerca de 59 bits), no formato
 * xxxx-xxxx-xxxx, sorteados com gerador criptográfico.
 */
export function gerarSenhaProvisoria(): string {
  const grupos = Array.from({ length: GRUPOS }, () =>
    Array.from({ length: TAMANHO_DO_GRUPO }, () => ALFABETO[randomInt(ALFABETO.length)]).join(''),
  );
  return grupos.join('-');
}
