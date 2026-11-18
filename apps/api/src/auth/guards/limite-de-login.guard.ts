import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limite de tentativas de login por origem (FR-006). Usado só na rota de login; a contagem é
 * por endereço de origem (req.ip), em memória. Não bloqueia a conta: passado o minuto, ou de
 * outra origem, o login volta a ser avaliado.
 */
@Injectable()
export class LimiteDeLoginGuard extends ThrottlerGuard {
  protected override throwThrottlingException(_contexto: ExecutionContext): Promise<void> {
    throw new ThrottlerException('Muitas tentativas. Tente de novo em instantes.');
  }
}
