import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Length } from 'class-validator';
import type { Exercise } from '../../generated/prisma/client.js';
import { UNIDADES, type Unidade } from '../../fichas/ficha-validation.js';
import { unidadeParaAApi } from '../unidade.js';

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CriarExercicioDto {
  @ApiProperty({ example: 'Supino reto' })
  @Transform(aparar)
  @IsString()
  @Length(1, 100)
  nome!: string;

  @ApiProperty({ enum: UNIDADES, enumName: 'Unidade' })
  @IsIn(UNIDADES)
  unidadePadrao!: Unidade;
}

export class ExercicioDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Supino reto' })
  nome!: string;

  @ApiProperty({ enum: UNIDADES, enumName: 'Unidade' })
  unidadePadrao!: Unidade;

  @ApiProperty({
    description: 'Desativado some das novas escolhas, mas segue nas fichas que o usam.',
  })
  ativo!: boolean;
}

export function paraExercicioDto(exercicio: Exercise): ExercicioDto {
  return {
    id: exercicio.id,
    nome: exercicio.name,
    unidadePadrao: unidadeParaAApi(exercicio.defaultUnit),
    ativo: exercicio.active,
  };
}
