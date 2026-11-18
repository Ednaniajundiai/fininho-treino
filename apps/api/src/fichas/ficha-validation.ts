/**
 * Regras da ficha que não dependem do banco (contrato fichas/C-01, FR-003 a FR-005, FR-012).
 * Funções puras: recebem a ficha como chegou na requisição (já com os tipos conferidos pelo
 * DTO) e dizem o que está errado, em português, para o professor corrigir.
 */

export const MAX_DIAS = 10;
export const MAX_ITENS_POR_DIA = 30;

export const UNIDADES = ['repeticoes', 'segundos'] as const;
export type Unidade = (typeof UNIDADES)[number];
export const MODALIDADES = ['esteira', 'bike', 'escada', 'livre'] as const;
export type Modalidade = (typeof MODALIDADES)[number];
export const TIPOS_DE_ITEM = ['forca', 'cardio'] as const;
export type TipoDeItem = (typeof TIPOS_DE_ITEM)[number];

export type ItemEntrada = {
  tipo: TipoDeItem;
  observacao?: string;
  exercicioId?: string;
  series?: number;
  faixaMin?: number;
  faixaMax?: number;
  unidade?: Unidade;
  modalidade?: Modalidade;
  duracaoMinMin?: number;
  duracaoMaxMin?: number;
};

export type DiaEntrada = { titulo: string; itens: ItemEntrada[] };

/** O rótulo do dia não é guardado: deriva da ordem (1 → A, 2 → B…), D-05. */
export function rotuloDoDia(ordem: number): string {
  return String.fromCharCode(64 + ordem);
}

/**
 * Motivos para recusar a ficha; lista vazia quando ela pode ser gravada. Os tetos valem
 * sempre; "ao menos um dia e um item por dia" só vale para a ficha que fica ativa (FR-005).
 */
export function motivosDeRecusa(dias: DiaEntrada[], { ativa }: { ativa: boolean }): string[] {
  const motivos: string[] = [];
  if (dias.length > MAX_DIAS) motivos.push(`A ficha pode ter no máximo ${MAX_DIAS} dias.`);
  if (ativa && dias.length === 0) motivos.push('Para ativar, a ficha precisa de ao menos um dia.');

  dias.forEach((dia, d) => {
    const rotulo = rotuloDoDia(d + 1);
    if (dia.itens.length > MAX_ITENS_POR_DIA) {
      motivos.push(`O dia ${rotulo} pode ter no máximo ${MAX_ITENS_POR_DIA} itens.`);
    }
    if (ativa && dia.itens.length === 0) {
      motivos.push(`Para ativar, o dia ${rotulo} precisa de ao menos um item.`);
    }
    dia.itens.forEach((item, i) => {
      for (const motivo of motivosDoItem(item))
        motivos.push(`Dia ${rotulo}, item ${i + 1}: ${motivo}`);
    });
  });
  return motivos;
}

function motivosDoItem(item: ItemEntrada): string[] {
  const temForca = [item.exercicioId, item.series, item.faixaMin, item.faixaMax, item.unidade];
  const temCardio = [item.modalidade, item.duracaoMinMin, item.duracaoMaxMin];
  // null conta como ausente: o DTO aceita campo opcional enviado como null.
  const algum = (campos: unknown[]) => campos.some((campo) => campo != null);
  const todos = (campos: unknown[]) => campos.every((campo) => campo != null);

  if (item.tipo === 'forca') {
    if (algum(temCardio)) return ['item de força não leva modalidade nem duração.'];
    if (!todos(temForca)) {
      return ['item de força precisa de exercício, séries, faixa mínima e máxima e unidade.'];
    }
    const motivos: string[] = [];
    if ((item.series ?? 0) < 1) motivos.push('o número de séries precisa ser 1 ou mais.');
    if ((item.faixaMin ?? 0) > (item.faixaMax ?? 0)) {
      motivos.push('a faixa mínima não pode ser maior que a máxima.');
    }
    return motivos;
  }

  if (algum(temForca)) return ['item de cardio não leva exercício, séries, faixa nem unidade.'];
  if (!todos(temCardio)) return ['item de cardio precisa de modalidade e duração mínima e máxima.'];
  if ((item.duracaoMinMin ?? 0) > (item.duracaoMaxMin ?? 0)) {
    return ['a duração mínima não pode ser maior que a máxima.'];
  }
  return [];
}

export type DiaNumerado<I> = {
  ordem: number;
  rotulo: string;
  titulo: string;
  itens: (I & { ordem: number })[];
};

/** Dias e itens recebem a ordem em que vieram: é ela que define a rotação (FR-012, C-03). */
export function numerarDias<I>(dias: { titulo: string; itens: I[] }[]): DiaNumerado<I>[] {
  return dias.map((dia, d) => ({
    ordem: d + 1,
    rotulo: rotuloDoDia(d + 1),
    titulo: dia.titulo,
    itens: dia.itens.map((item, i) => ({ ...item, ordem: i + 1 })),
  }));
}
