import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-line bg-surface shadow-sm', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('font-display text-lg font-bold', className)} {...props}>
      {children}
    </h2>
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 pb-4', className)} {...props} />;
}

export function Badge({
  className,
  tono = 'neutro',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tono?: 'neutro' | 'accent' | 'good' | 'warn' | 'crit' | 'info';
}) {
  const tonos = {
    neutro: 'border-line bg-surface-2 text-muted',
    accent: 'border-accent/30 bg-accent-soft text-ink',
    good: 'border-good/30 bg-good-soft text-good',
    warn: 'border-warn/30 bg-warn-soft text-warn',
    crit: 'border-crit/30 bg-crit-soft text-crit',
    info: 'border-info/30 bg-info-soft text-info',
  }[tono];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold',
        tonos,
        className,
      )}
      {...props}
    />
  );
}

/** Encabezado de página: título, contexto y acciones. */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  className,
}: {
  titulo: string;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-1 text-muted">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}
