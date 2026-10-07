import { AlertTriangle, Inbox, Loader2, RotateCw } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { mensajeDeError } from '@/api/errores';
import { cn } from '@/lib/cn';
import { Button } from './button';

/** Estados de carga, vacío y error (definición de terminado, §9). */

export function Cargando({
  texto = 'Cargando…',
  className,
}: {
  texto?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn('flex items-center justify-center gap-2 py-10 text-muted', className)}
    >
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span>{texto}</span>
    </div>
  );
}

export function Esqueleto({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden className={cn('animate-pulse rounded-lg bg-line/60', className)} {...props} />
  );
}

export function Vacio({
  titulo,
  descripcion,
  accion,
  icono,
  className,
}: {
  titulo: string;
  descripcion?: ReactNode;
  accion?: ReactNode;
  icono?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-6 py-10 text-center',
        className,
      )}
    >
      <span className="text-muted">{icono ?? <Inbox className="size-8" aria-hidden />}</span>
      <p className="font-semibold">{titulo}</p>
      {descripcion && <p className="max-w-sm text-sm text-muted">{descripcion}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

export function ErrorEstado({
  error,
  titulo = 'No pudimos cargar esta información',
  reintentar,
  reintentando = false,
  className,
}: {
  error: unknown;
  titulo?: string;
  reintentar?: () => void;
  reintentando?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border border-crit/40 bg-crit-soft px-6 py-8 text-center',
        className,
      )}
    >
      <AlertTriangle className="size-7 text-crit" aria-hidden />
      <p className="font-semibold">{titulo}</p>
      <p className="max-w-md text-sm">{mensajeDeError(error)}</p>
      {reintentar && (
        <Button variante="secundario" className="mt-2" cargando={reintentando} onClick={reintentar}>
          {reintentando ? (
            'Reintentando…'
          ) : (
            <>
              <RotateCw aria-hidden /> Reintentar
            </>
          )}
        </Button>
      )}
    </div>
  );
}

/** Mensaje de error en línea para formularios y paneles. */
export function Alerta({
  tipo = 'error',
  children,
  className,
}: {
  tipo?: 'error' | 'aviso' | 'info' | 'exito';
  children: ReactNode;
  className?: string;
}) {
  const estilos = {
    error: 'border-crit/40 bg-crit-soft text-ink',
    aviso: 'border-warn/40 bg-warn-soft text-ink',
    info: 'border-info/40 bg-info-soft text-ink',
    exito: 'border-good/40 bg-good-soft text-ink',
  }[tipo];
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={cn('rounded-lg border px-3 py-2.5 text-sm', estilos, className)}
    >
      {children}
    </div>
  );
}
