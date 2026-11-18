import type { StatusDaFicha } from '@/lib/api/cliente';
import { NOME_DO_STATUS, TOM_DO_STATUS } from '@/lib/fichas';
import { cn } from '@/lib/utils';

export function ChipDeStatus({ status }: { status: StatusDaFicha }) {
  return (
    <span className={cn('rounded-lg px-2 py-1 text-sm', TOM_DO_STATUS[status])}>
      {NOME_DO_STATUS[status]}
    </span>
  );
}
