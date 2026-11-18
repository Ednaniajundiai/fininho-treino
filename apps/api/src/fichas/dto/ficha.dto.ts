import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { unidadeParaAApi } from '../../exercicios/unidade.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  MODALIDADES,
  type Modalidade,
  rotuloDoDia,
  TIPOS_DE_ITEM,
  type TipoDeItem,
  UNIDADES,
  type Unidade,
} from '../ficha-validation.js';
import { modalidadeParaAApi, STATUS, type Status, statusParaAApi } from '../valores.js';

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Entrada. Os DTOs conferem só o formato de cada campo; as regras entre campos (faixa,
// séries, campos por tipo, tetos) ficam em ficha-validation.ts, num lugar só.

export class ItemFichaEntradaDto {
  @ApiProperty({ enum: TIPOS_DE_ITEM, enumName: 'TipoDeItem' })
  @IsIn(TIPOS_DE_ITEM)
  tipo!: TipoDeItem;

  @ApiPropertyOptional({ example: 'Cadência lenta na descida' })
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(500)
  observacao?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Força: exercício ativo do catálogo.' })
  @IsOptional()
  @IsUUID()
  exercicioId?: string;

  @ApiPropertyOptional({ description: 'Força: 1 ou mais.', example: 3 })
  @IsOptional()
  @IsInt()
  @Max(100)
  series?: number;

  @ApiPropertyOptional({ description: 'Força: mínimo da faixa.', example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  faixaMin?: number;

  @ApiPropertyOptional({ description: 'Força: máximo da faixa.', example: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  faixaMax?: number;

  @ApiPropertyOptional({ enum: UNIDADES, enumName: 'Unidade', description: 'Força.' })
  @IsOptional()
  @IsIn(UNIDADES)
  unidade?: Unidade;

  @ApiPropertyOptional({ enum: MODALIDADES, enumName: 'Modalidade', description: 'Cardio.' })
  @IsOptional()
  @IsIn(MODALIDADES)
  modalidade?: Modalidade;

  @ApiPropertyOptional({ description: 'Cardio: duração mínima em minutos.', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  duracaoMinMin?: number;

  @ApiPropertyOptional({ description: 'Cardio: duração máxima em minutos.', example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  duracaoMaxMin?: number;
}

export class DiaFichaEntradaDto {
  @ApiProperty({ example: 'Peito e tríceps' })
  @Transform(aparar)
  @IsString()
  @Length(1, 80)
  titulo!: string;

  @ApiProperty({ type: [ItemFichaEntradaDto], description: 'Na ordem de execução.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemFichaEntradaDto)
  itens!: ItemFichaEntradaDto[];
}

export class CriarFichaDto {
  @ApiProperty({ example: 'Hipertrofia — bloco 1' })
  @Transform(aparar)
  @IsString()
  @Length(1, 100)
  nome!: string;

  @ApiPropertyOptional({
    description: 'Verdadeiro cria já ativa (arquiva a ativa anterior); senão nasce rascunho.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  ativar?: boolean;

  @ApiProperty({
    type: [DiaFichaEntradaDto],
    description: 'Na ordem da rotação; o rótulo (A, B, C…) vem dessa ordem.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiaFichaEntradaDto)
  dias!: DiaFichaEntradaDto[];
}

// Saída (contrato fichas/C-01).

export class ItemFichaDto {
  @ApiProperty({ example: 1 })
  ordem!: number;

  @ApiProperty({ enum: TIPOS_DE_ITEM, enumName: 'TipoDeItem' })
  tipo!: TipoDeItem;

  @ApiPropertyOptional()
  observacao?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  exercicioId?: string;

  @ApiPropertyOptional({ description: 'Nome do exercício, para quem não vê o catálogo.' })
  exercicioNome?: string;

  @ApiPropertyOptional()
  series?: number;

  @ApiPropertyOptional()
  faixaMin?: number;

  @ApiPropertyOptional()
  faixaMax?: number;

  @ApiPropertyOptional({ enum: UNIDADES, enumName: 'Unidade' })
  unidade?: Unidade;

  @ApiPropertyOptional({ enum: MODALIDADES, enumName: 'Modalidade' })
  modalidade?: Modalidade;

  @ApiPropertyOptional()
  duracaoMinMin?: number;

  @ApiPropertyOptional()
  duracaoMaxMin?: number;
}

export class DiaFichaDto {
  @ApiProperty({ example: 'A' })
  rotulo!: string;

  @ApiProperty({ example: 'Peito e tríceps' })
  titulo!: string;

  @ApiProperty({ example: 1 })
  ordem!: number;

  @ApiProperty({ type: [ItemFichaDto] })
  itens!: ItemFichaDto[];
}

export class FichaResumoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  alunoId!: string;

  @ApiProperty({ example: 'Hipertrofia — bloco 1' })
  nome!: string;

  @ApiProperty({ enum: STATUS, enumName: 'StatusDaFicha' })
  status!: Status;

  @ApiProperty({ format: 'date-time' })
  criadaEm!: string;

  @ApiProperty({ format: 'date-time' })
  atualizadaEm!: string;
}

export class FichaDto extends FichaResumoDto {
  @ApiProperty({ format: 'uuid' })
  professorId!: string;

  @ApiProperty({ type: [DiaFichaDto] })
  dias!: DiaFichaDto[];
}

/** Resposta de GET /minha-ficha: a ficha ativa do aluno, ou null quando ele não tem uma. */
export class MinhaFichaDto {
  @ApiProperty({
    type: FichaDto,
    nullable: true,
    description: 'A ficha ativa do aluno logado; null se não há ficha ativa.',
  })
  ficha!: FichaDto | null;
}

/** O que o service carrega para montar a ficha completa: dias e itens em ordem. */
export const FICHA_COMPLETA = {
  days: {
    orderBy: { position: 'asc' },
    include: {
      items: { orderBy: { position: 'asc' }, include: { exercise: { select: { name: true } } } },
    },
  },
} as const satisfies Prisma.PlanInclude;
export type FichaCompleta = Prisma.PlanGetPayload<{ include: typeof FICHA_COMPLETA }>;
type ItemCompleto = FichaCompleta['days'][number]['items'][number];

/** Objeto simples com os campos do resumo (não instância da classe, que só serve ao Swagger). */
export function paraFichaResumoDto(
  ficha: Prisma.PlanGetPayload<object>,
): Pick<FichaResumoDto, keyof FichaResumoDto> {
  return {
    id: ficha.id,
    alunoId: ficha.studentId,
    nome: ficha.name,
    status: statusParaAApi(ficha.status),
    criadaEm: ficha.createdAt.toISOString(),
    atualizadaEm: ficha.updatedAt.toISOString(),
  };
}

export function paraFichaDto(ficha: FichaCompleta): FichaDto {
  return {
    ...paraFichaResumoDto(ficha),
    professorId: ficha.teacherId,
    dias: ficha.days.map((dia) => ({
      rotulo: rotuloDoDia(dia.position),
      titulo: dia.title,
      ordem: dia.position,
      itens: dia.items.map(paraItemFichaDto),
    })),
  };
}

/** Só os campos do tipo do item aparecem; observação só quando existe. */
function paraItemFichaDto(item: ItemCompleto): ItemFichaDto {
  const observacao = item.notes === null ? {} : { observacao: item.notes };
  if (item.type === 'STRENGTH') {
    return {
      ordem: item.position,
      tipo: 'forca',
      exercicioId: item.exerciseId ?? undefined,
      exercicioNome: item.exercise?.name,
      series: item.sets ?? undefined,
      faixaMin: item.rangeMin ?? undefined,
      faixaMax: item.rangeMax ?? undefined,
      unidade: item.unit === null ? undefined : unidadeParaAApi(item.unit),
      ...observacao,
    };
  }
  return {
    ordem: item.position,
    tipo: 'cardio',
    modalidade: item.cardioMode === null ? undefined : modalidadeParaAApi(item.cardioMode),
    duracaoMinMin: item.minutesMin ?? undefined,
    duracaoMaxMin: item.minutesMax ?? undefined,
    ...observacao,
  };
}
