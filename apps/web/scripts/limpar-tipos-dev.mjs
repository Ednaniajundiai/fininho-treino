// O `next dev` grava tipos de rota em .next/dev/types, e o tsconfig do Next os inclui. Se o
// servidor é encerrado no meio de uma escrita, o arquivo fica vazio e o `tsc` falha por causa
// dele. O typecheck apaga essa pasta antes de rodar; o `next typegen` e o `next dev` a recriam.
import { rmSync } from 'node:fs';

rmSync(new URL('../.next/dev/types', import.meta.url), { recursive: true, force: true });
