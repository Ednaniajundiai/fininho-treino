import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-card p-6 text-card-foreground',
        className,
      )}
      {...props}
    />
  );
}

/** Aviso com cor de estado (nunca decorativa): erro, atenção ou sucesso. */
export function Aviso({
  tom,
  className,
  ...props
}: ComponentProps<'p'> & { tom: 'erro' | 'atencao' | 'sucesso' }) {
  const tons = {
    erro: 'bg-destructive-soft text-destructive',
    atencao: 'bg-warning-soft text-warning',
    sucesso: 'bg-success-soft text-success',
  };
  return (
    <p
      role={tom === 'erro' ? 'alert' : 'status'}
      className={cn('rounded-control px-3 py-2 text-sm', tons[tom], className)}
      {...props}
    />
  );
}
