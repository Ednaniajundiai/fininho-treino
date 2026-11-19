import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Seleção nativa com a cara do Input: no celular abre o seletor do sistema, que é o mais
 * fácil de usar com o dedo.
 */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'min-h-11 w-full rounded-control border border-input bg-card px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}
