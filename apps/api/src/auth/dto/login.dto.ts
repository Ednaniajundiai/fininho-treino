import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizarEmail } from '../../usuarios/email.js';
import { SENHA_MAX } from '../../usuarios/senha.js';

export class LoginDto {
  @ApiProperty({ example: 'paula@exemplo.test' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizarEmail(value) : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // Sem a política completa aqui: senha fora dela simplesmente não confere. O teto evita
  // gastar argon2 com entrada gigante.
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(SENHA_MAX)
  senha!: string;
}
