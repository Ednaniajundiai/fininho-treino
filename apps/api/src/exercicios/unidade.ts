import type { ExerciseUnit } from '../generated/prisma/client.js';
import type { Unidade } from '../fichas/ficha-validation.js';

// O banco guarda os valores em inglês (plan, D-01); a API fala os do contrato fichas/C-02.
const PARA_O_BANCO = { repeticoes: 'REPS', segundos: 'SECONDS' } as const satisfies Record<
  Unidade,
  ExerciseUnit
>;
const PARA_A_API = { REPS: 'repeticoes', SECONDS: 'segundos' } as const satisfies Record<
  ExerciseUnit,
  Unidade
>;

export const unidadeParaOBanco = (unidade: Unidade): ExerciseUnit => PARA_O_BANCO[unidade];
export const unidadeParaAApi = (unidade: ExerciseUnit): Unidade => PARA_A_API[unidade];
