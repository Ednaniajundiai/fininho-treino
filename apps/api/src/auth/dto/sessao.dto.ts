import { ApiProperty } from '@nestjs/swagger';
import { ContaDto } from '../../usuarios/dto/conta.dto.js';

/** Resposta de login e de renovação. O token de renovação não vem aqui: vai no cookie httpOnly. */
export class SessaoDto {
  @ApiProperty({ description: 'JWT de acesso, válido por 15 minutos. Guardar só em memória.' })
  accessToken!: string;

  @ApiProperty({ type: ContaDto })
  usuario!: ContaDto;
}
