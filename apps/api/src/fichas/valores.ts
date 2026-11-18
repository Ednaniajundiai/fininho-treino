import type { CardioMode, PlanItemType, PlanStatus } from '../generated/prisma/client.js';
import type { Modalidade, TipoDeItem } from './ficha-validation.js';

// O banco guarda os valores em inglês (plan, D-01); a API fala os do contrato fichas/C-01.

export const STATUS = ['rascunho', 'ativa', 'arquivada'] as const;
export type Status = (typeof STATUS)[number];

const STATUS_NA_API = {
  DRAFT: 'rascunho',
  ACTIVE: 'ativa',
  ARCHIVED: 'arquivada',
} as const satisfies Record<PlanStatus, Status>;

export const statusParaAApi = (status: PlanStatus): Status => STATUS_NA_API[status];

const MODALIDADE_NO_BANCO = {
  esteira: 'TREADMILL',
  bike: 'BIKE',
  escada: 'STAIRS',
  livre: 'FREE',
} as const satisfies Record<Modalidade, CardioMode>;
const MODALIDADE_NA_API = {
  TREADMILL: 'esteira',
  BIKE: 'bike',
  STAIRS: 'escada',
  FREE: 'livre',
} as const satisfies Record<CardioMode, Modalidade>;

export const modalidadeParaOBanco = (modalidade: Modalidade): CardioMode =>
  MODALIDADE_NO_BANCO[modalidade];
export const modalidadeParaAApi = (modalidade: CardioMode): Modalidade =>
  MODALIDADE_NA_API[modalidade];

export const tipoParaOBanco = (tipo: TipoDeItem): PlanItemType =>
  tipo === 'forca' ? 'STRENGTH' : 'CARDIO';
