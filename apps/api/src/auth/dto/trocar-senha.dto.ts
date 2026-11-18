import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { SENHA_MAX, SENHA_MIN } from '../../usuarios/senha.js';

// Aqui só o formato (texto, com teto para não gastar argon2 com entrada gigante). A política
// de senha mora num lugar só, usuarios/senha.ts, e é aplicada pelo service.
export class TrocarSenhaDto {
  @ApiProperty({ description: 'A senha atual (a provisória, no primeiro acesso).' })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  senhaAtual!: string;

  @ApiProperty({ minLength: SENHA_MIN, maxLength: SENHA_MAX })
  @IsString()
  @MaxLength(1024)
  novaSenha!: string;
}
