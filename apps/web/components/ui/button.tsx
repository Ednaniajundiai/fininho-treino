import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Padrão shadcn/ui, com os tokens do DESIGN.base: controles com raio de 12px e alvo de toque
// de pelo menos 44px. No máximo um botão primário por tela.
const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border border-input bg-card text-foreground hover:bg-background',
        ghost: 'text-foreground hover:bg-border/60',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant }), className)} {...props} />;
}
