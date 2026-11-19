import type { Modalidade, StatusDaFicha, Unidade } from '@/lib/api/cliente';

// Textos de tela para os valores da API (contrato fichas/C-01). Os valores ficam como a API
// manda; só o que aparece para a pessoa é traduzido aqui, num lugar só.

export const NOME_DA_UNIDADE: Record<Unidade, string> = {
  repeticoes: 'Repetições',
  segundos: 'Segundos',
};

/** Sufixo curto para a faixa: "8–12 reps", "30–45 s". */
export const SUFIXO_DA_UNIDADE: Record<Unidade, string> = {
  repeticoes: 'reps',
  segundos: 's',
};

export const NOME_DA_MODALIDADE: Record<Modalidade, string> = {
  esteira: 'Esteira',
  bike: 'Bike',
  escada: 'Escada',
  livre: 'Livre',
};

export const NOME_DO_STATUS: Record<StatusDaFicha, string> = {
  rascunho: 'Rascunho',
  ativa: 'Ativa',
  arquivada: 'Arquivada',
};

/** Cor de estado do chip (nunca decorativa): ativa é positivo; rascunho e arquivada, neutros. */
export const TOM_DO_STATUS: Record<StatusDaFicha, string> = {
  rascunho: 'bg-warning-soft text-warning',
  ativa: 'bg-success-soft text-success',
  arquivada: 'bg-border/60 text-muted-foreground',
};

/** O rótulo do dia vem da posição (1 → A, 2 → B…), como na API (D-05). */
export function rotuloDoDia(posicao: number): string {
  return String.fromCharCode(64 + posicao);
}

/** "8–12" quando a faixa tem dois valores; "10" quando mínimo e máximo coincidem. */
export function faixa(min: number | undefined, max: number | undefined): string {
  if (min === undefined || max === undefined) return '';
  return min === max ? String(min) : `${min}–${max}`;
}

export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
