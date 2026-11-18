import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators.js';

class SaudeDto {
  @ApiProperty({ example: 'ok' })
  status!: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Verificação de saúde (pública)' })
  @ApiOkResponse({ type: SaudeDto })
  verificar(): SaudeDto {
    return { status: 'ok' };
  }
}
