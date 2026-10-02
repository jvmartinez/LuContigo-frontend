import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const variantesBoton = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variante: {
        primario: 'bg-accent text-accent-ink hover:brightness-110',
        secundario: 'border border-line bg-surface text-ink hover:bg-surface-2',
        suave: 'bg-accent-soft text-ink hover:brightness-95',
        fantasma: 'text-ink hover:bg-surface-2',
        peligro: 'bg-crit text-white hover:brightness-110 dark:text-bg',
        'peligro-suave': 'border border-crit/40 bg-crit-soft text-crit hover:brightness-95',
        enlace: 'h-auto min-h-0 px-0 text-accent underline-offset-4 hover:underline',
      },
      tamano: {
        // 44 px: objetivo táctil mínimo (las enfermeras usan tableta).
        md: 'min-h-tap px-4 text-sm',
        sm: 'min-h-9 px-3 text-sm',
        lg: 'min-h-12 px-6 text-base',
        icono: 'size-11',
      },
    },
    defaultVariants: { variante: 'primario', tamano: 'md' },
  },
);

export interface BotonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variantesBoton> {
  asChild?: boolean;
  cargando?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, BotonProps>(
  (
    {
      className,
      variante,
      tamano,
      asChild = false,
      cargando = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(variantesBoton({ variante, tamano }), className)}
        disabled={disabled || cargando}
        aria-busy={cargando || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {cargando && <Loader2 className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
