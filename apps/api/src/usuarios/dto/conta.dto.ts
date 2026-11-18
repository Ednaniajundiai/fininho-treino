import { ApiProperty } from '@nestjs/swagger';
import { Role, type User } from '../../generated/prisma/client.js';

/** A conta como a API a mostra: nunca inclui senha nem hash. */
export class ContaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Paula Prado' })
  nome!: string;

  @ApiProperty({ example: 'paula@exemplo.test' })
  email!: string;

  @ApiProperty({ enum: Role, enumName: 'Papel' })
  papel!: Role;

  @ApiProperty({ description: 'Verdadeiro enquanto a conta não trocou a senha provisória.' })
  senhaProvisoria!: boolean;
}

export function paraContaDto(usuario: User): ContaDto {
  return {
    id: usuario.id,
    nome: usuario.name,
    email: usuario.email,
    papel: usuario.role,
    senhaProvisoria: usuario.mustChangePassword,
  };
}
