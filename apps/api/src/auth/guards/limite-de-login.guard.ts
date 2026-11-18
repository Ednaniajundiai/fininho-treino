import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limite de tentativas por origem (FR-006) nas rotas que conferem senha: login e troca de
 * senha. Só age onde é aplicado com @UseGuards; a contagem é
 * por endereço de origem (req.ip), em memória. Não bloqueia a conta: passado o minuto, ou de
 * outra origem, o login volta a ser avaliado.
 */
@Injectable()
export class LimiteDeLoginGuard extends ThrottlerGuard {
  protected override throwThrottlingException(_contexto: ExecutionContext): Promise<void> {
    throw new ThrottlerException('Muitas tentativas. Tente de novo em instantes.');
  }
}
