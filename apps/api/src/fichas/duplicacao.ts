import type { Prisma } from '../generated/prisma/client.js';
import type { FichaCompleta } from './dto/ficha.dto.js';

/**
 * Dias e itens da ficha prontos para gravar numa ficha nova (FR-010). A cópia leva os mesmos
 * valores, mas linhas novas: editar uma não altera a outra. O exercício vai como está, mesmo
 * desativado: a cópia é a mesma prescrição (FR-011, "continua nas fichas existentes").
 */
export function copiaDosDias(ficha: FichaCompleta): Prisma.PlanDayCreateWithoutPlanInput[] {
  return ficha.days.map((dia) => ({
    position: dia.position,
    title: dia.title,
    items: {
      create: dia.items.map((item) => ({
        position: item.position,
        type: item.type,
        notes: item.notes,
        exerciseId: item.exerciseId,
        sets: item.sets,
        rangeMin: item.rangeMin,
        rangeMax: item.rangeMax,
        unit: item.unit,
        cardioMode: item.cardioMode,
        minutesMin: item.minutesMin,
        minutesMax: item.minutesMax,
      })),
    },
  }));
}
