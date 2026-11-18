import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { normalizarEmail } from '../email.js';
import { ContaDto } from './conta.dto.js';

export class CriarAlunoDto {
  @ApiProperty({ example: 'Ari Alves' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 120)
  nome!: string;

  @ApiProperty({ example: 'ari@exemplo.test' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizarEmail(value) : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

/** Resposta da criação e da redefinição: o único momento em que a senha provisória aparece. */
export class AlunoComSenhaProvisoriaDto {
  @ApiProperty({ type: ContaDto })
  aluno!: ContaDto;

  @ApiProperty({
    description:
      'Senha provisória gerada pelo sistema. Mostrada só nesta resposta; não é consultável depois.',
    example: 'abcd-efgh-jkmn',
  })
  senhaProvisoria!: string;
}
