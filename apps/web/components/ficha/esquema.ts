import { z } from 'zod';
import type { CriarFicha } from '@/lib/api/cliente';
import { rotuloDoDia } from '@/lib/fichas';

/*
 * Validação do editor, espelhando a da API (DTOs e ficha-validation.ts da 002) só para dar
 * retorno rápido. Quem decide é a API: o que passar aqui e ela recusar aparece com a
 * mensagem dela.
 */

export const MAX_DIAS = 10;
export const MAX_ITENS_POR_DIA = 30;

/** Inteiro numa faixa; a mensagem aparece embaixo do campo, então não repete o nome dele. */
function inteiro(min: number, max: number) {
  return z
    .number({ error: 'Informe um número.' })
    .int({ error: 'Use um número inteiro.' })
    .min(min, { error: `No mínimo ${min}.` })
    .max(max, { error: `No máximo ${max}.` });
}

const observacao = z.string().trim().max(500, { error: 'Observação: no máximo 500 caracteres.' });

const itemDeForca = z
  .object({
    tipo: z.literal('forca'),
    exercicioId: z.string().min(1, { error: 'Escolha o exercício.' }),
    series: inteiro(1, 100),
    faixaMin: inteiro(1, 9999),
    faixaMax: inteiro(1, 9999),
    unidade: z.enum(['repeticoes', 'segundos']),
    observacao,
  })
  .refine((item) => item.faixaMin <= item.faixaMax, {
    error: 'A faixa mínima não pode ser maior que a máxima.',
    path: ['faixaMax'],
  });

const itemDeCardio = z
  .object({
    tipo: z.literal('cardio'),
    modalidade: z.enum(['esteira', 'bike', 'escada', 'livre']),
    duracaoMinMin: inteiro(1, 999),
    duracaoMaxMin: inteiro(1, 999),
    observacao,
  })
  .refine((item) => item.duracaoMinMin <= item.duracaoMaxMin, {
    error: 'A duração mínima não pode ser maior que a máxima.',
    path: ['duracaoMaxMin'],
  });

export const esquemaDaFicha = z.object({
  nome: z
    .string()
    .trim()
    .min(1, { error: 'Dê um nome à ficha.' })
    .max(100, { error: 'Nome: no máximo 100 caracteres.' }),
  dias: z
    .array(
      z.object({
        titulo: z
          .string()
          .trim()
          .min(1, { error: 'Dê um título ao dia.' })
          .max(80, { error: 'Título: no máximo 80 caracteres.' }),
        itens: z
          .array(z.discriminatedUnion('tipo', [itemDeForca, itemDeCardio]))
          .max(MAX_ITENS_POR_DIA, { error: `No máximo ${MAX_ITENS_POR_DIA} itens por dia.` }),
      }),
    )
    .max(MAX_DIAS, { error: `A ficha pode ter no máximo ${MAX_DIAS} dias.` }),
});

/** O que o formulário guarda (números podem chegar vazios, como NaN). */
export type FichaNoFormulario = z.input<typeof esquemaDaFicha>;
/** A ficha depois de passar pela validação. */
export type FichaValida = z.output<typeof esquemaDaFicha>;
export type ItemNoFormulario = FichaNoFormulario['dias'][number]['itens'][number];

export const novoItemDeForca = (): ItemNoFormulario => ({
  tipo: 'forca',
  exercicioId: '',
  series: 3,
  faixaMin: 8,
  faixaMax: 12,
  unidade: 'repeticoes',
  observacao: '',
});

export const novoItemDeCardio = (): ItemNoFormulario => ({
  tipo: 'cardio',
  modalidade: 'esteira',
  duracaoMinMin: 10,
  duracaoMaxMin: 15,
  observacao: '',
});

/** Para ativar, a ficha precisa de ao menos um dia, e cada dia de ao menos um item (FR-005). */
export function motivosParaNaoAtivar(ficha: FichaValida): string[] {
  if (ficha.dias.length === 0) return ['Para ativar, a ficha precisa de ao menos um dia.'];
  return ficha.dias.flatMap((dia, d) =>
    dia.itens.length === 0
      ? [`Para ativar, o dia ${rotuloDoDia(d + 1)} precisa de ao menos um item.`]
      : [],
  );
}

/** Monta o corpo do POST só com os campos do tipo de cada item (a API recusa campo a mais). */
export function paraCorpo(ficha: FichaValida, ativar: boolean): CriarFicha {
  return {
    nome: ficha.nome,
    ativar,
    dias: ficha.dias.map((dia) => ({
      titulo: dia.titulo,
      itens: dia.itens.map((item) => {
        const nota = item.observacao ? { observacao: item.observacao } : {};
        if (item.tipo === 'forca') {
          const { tipo, exercicioId, series, faixaMin, faixaMax, unidade } = item;
          return { tipo, exercicioId, series, faixaMin, faixaMax, unidade, ...nota };
        }
        const { tipo, modalidade, duracaoMinMin, duracaoMaxMin } = item;
        return { tipo, modalidade, duracaoMinMin, duracaoMaxMin, ...nota };
      }),
    })),
  };
}
